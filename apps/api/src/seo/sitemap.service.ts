import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SlugEntityType } from "@prisma/client";
import {
  PUBLIC_LANGS,
  SEO_CACHE_TTL_SECONDS,
  absoluteUrlOnOrigin,
  collectionPath,
  eventDetailPath,
  legalPagePath,
  overviewPath,
  placeDetailPath,
  platformPricingPath,
  productsPath,
  regionListPath,
  siteHomePath,
  staticPagePath,
  withoutOwnerPrefix,
  staticPagesListPath,
  townDetailPath,
} from "./public-path.util";
import { SitemapScope, SitemapScopeResolver } from "./sitemap-scope";

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

const SITEMAP_CHUNKS = [
  "static",
  "sites",
  "places",
  "events",
  "towns",
  "pages",
  "collections",
] as const;

export type SitemapChunk = (typeof SITEMAP_CHUNKS)[number];

type CacheEntry = { expiresAt: number; body: string };

/**
 * Dynamic, host-scoped sitemaps from DB.
 * Cache: in-memory, TTL {@link SEO_CACHE_TTL_SECONDS}s, cleared on content writes via invalidate().
 */
@Injectable()
export class SitemapService {
  private readonly cache = new Map<string, CacheEntry>();
  private generation = 0;
  private lastInvalidatedAt = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeResolver: SitemapScopeResolver
  ) {}

  chunks(): readonly SitemapChunk[] {
    return SITEMAP_CHUNKS;
  }

  /** Bust in-memory sitemap cache (all hosts). Call after public content / domain writes. */
  invalidate(): void {
    this.generation += 1;
    this.cache.clear();
    this.lastInvalidatedAt = new Date();
  }

  lastmodIso(): string {
    return this.lastInvalidatedAt.toISOString();
  }

  async buildIndexXml(scope: SitemapScope): Promise<string> {
    return this.cached(`index:${scope.kind}:${scope.host}:${this.generation}`, async () => {
      const lastmod = this.lastmodIso();
      const entries = SITEMAP_CHUNKS.map(
        (chunk) => `  <sitemap>
    <loc>${escapeXml(`${scope.origin}/sitemap-${chunk}.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
      ).join("\n");

      return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
    });
  }

  async buildChunkXml(scope: SitemapScope, chunk: string): Promise<string> {
    if (!SITEMAP_CHUNKS.includes(chunk as SitemapChunk)) {
      throw new NotFoundException(`Unknown sitemap chunk: ${chunk}`);
    }
    return this.cached(
      `chunk:${scope.kind}:${scope.host}:${chunk}:${this.generation}`,
      async () => {
        const urls = await this.urlsForChunk(scope, chunk as SitemapChunk);
        return this.toUrlSetXml(urls);
      }
    );
  }

  private async cached(key: string, build: () => Promise<string>): Promise<string> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.body;
    const body = await build();
    this.cache.set(key, {
      body,
      expiresAt: Date.now() + SEO_CACHE_TTL_SECONDS * 1000,
    });
    return body;
  }

  private async isGlobalCrawlOn(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "globalCrawlability" },
    });
    if (setting && setting.type === "boolean") return setting.value === "true";
    return true;
  }

  private async urlsForChunk(scope: SitemapScope, chunk: SitemapChunk): Promise<SitemapUrl[]> {
    if (scope.kind === "unknown") return [];
    if (!(await this.isGlobalCrawlOn())) return [];

    if (scope.kind === "town") {
      return chunk === "towns" ? this.townEntityHostUrls(scope) : [];
    }
    if (scope.kind === "place") {
      return chunk === "places" ? this.placeEntityHostUrls(scope) : [];
    }
    if (scope.kind === "collection") {
      return chunk === "collections" ? this.collectionHostUrls(scope) : [];
    }
    if (scope.kind === "event") {
      if (chunk !== "events") return [];
      const lang = scope.domainLang || "hu";
      return [
        {
          loc: absoluteUrlOnOrigin(scope.origin, `/${lang}`),
          changefreq: "weekly",
          priority: 0.9,
        },
      ];
    }

    const siteIds =
      scope.kind === "site"
        ? [scope.siteId]
        : await this.scopeResolver.platformTenantSiteIds();

    switch (chunk) {
      case "static":
        return scope.kind === "platform" ? this.staticPlatformUrls(scope.origin) : [];
      case "sites":
        return this.siteUrls(scope.origin, siteIds, scope.kind === "site");
      case "places":
        return this.entitySlugUrls(
          scope.origin,
          siteIds,
          SlugEntityType.place,
          placeDetailPath,
          "weekly",
          0.8,
          { excludeOwnCustomDomain: true, omitOwner: scope.kind === "site" }
        );
      case "events":
        return this.entitySlugUrls(
          scope.origin,
          siteIds,
          SlugEntityType.event,
          eventDetailPath,
          "daily",
          0.7,
          { omitOwner: scope.kind === "site" }
        );
      case "towns":
        return this.entitySlugUrls(
          scope.origin,
          siteIds,
          SlugEntityType.town,
          townDetailPath,
          "weekly",
          0.7,
          { excludeOwnCustomDomain: true, omitOwner: scope.kind === "site" }
        );
      case "pages":
        return this.entitySlugUrls(
          scope.origin,
          siteIds,
          SlugEntityType.page,
          staticPagePath,
          "monthly",
          0.6,
          { omitOwner: scope.kind === "site" }
        );
      case "collections":
        return scope.kind === "platform" ? this.collectionUrls(scope.origin) : [];
      default:
        return [];
    }
  }

  private staticPlatformUrls(origin: string): SitemapUrl[] {
    const urls: SitemapUrl[] = [];
    for (const lang of PUBLIC_LANGS) {
      urls.push({
        loc: absoluteUrlOnOrigin(origin, overviewPath(lang)),
        changefreq: "weekly",
        priority: 0.9,
      });
      urls.push({
        loc: absoluteUrlOnOrigin(origin, regionListPath(lang)),
        changefreq: "daily",
        priority: 0.9,
      });
      urls.push({
        loc: absoluteUrlOnOrigin(origin, platformPricingPath(lang)),
        changefreq: "monthly",
        priority: 0.5,
      });
      urls.push({
        loc: absoluteUrlOnOrigin(origin, `/${lang}`),
        changefreq: "daily",
        priority: 1.0,
      });
    }
    return urls;
  }

  private async siteUrls(origin: string, siteIds: string[], omitOwner = false): Promise<SitemapUrl[]> {
    if (siteIds.length === 0) return [];
    const sites = await this.prisma.site.findMany({
      where: { id: { in: siteIds }, isActive: true },
      select: {
        id: true,
        isCrawlable: true,
        updatedAt: true,
        languages: true,
        siteKeys: {
          where: { isActive: true, isPrimary: true, redirectToId: null },
          select: { lang: true, slug: true },
        },
        legalPages: {
          where: { isActive: true, isCrawlable: true },
          select: { key: true, updatedAt: true },
        },
      },
    });

    const urls: SitemapUrl[] = [];
    for (const site of sites) {
      const lastmod = site.updatedAt.toISOString();
      for (const key of site.siteKeys) {
        const lang = key.lang;
        if (!site.languages.includes(lang)) continue;
        if (site.isCrawlable) {
          urls.push({
            loc: absoluteUrlOnOrigin(
              origin,
              omitOwner ? withoutOwnerPrefix(siteHomePath(lang, key.slug), lang, key.slug) : siteHomePath(lang, key.slug)
            ),
            lastmod,
            changefreq: "daily",
            priority: 0.9,
          });
          urls.push({
            loc: absoluteUrlOnOrigin(
              origin,
              omitOwner ? withoutOwnerPrefix(productsPath(lang, key.slug), lang, key.slug) : productsPath(lang, key.slug)
            ),
            lastmod,
            changefreq: "weekly",
            priority: 0.5,
          });
          urls.push({
            loc: absoluteUrlOnOrigin(
              origin,
              omitOwner
                ? withoutOwnerPrefix(staticPagesListPath(lang, key.slug), lang, key.slug)
                : staticPagesListPath(lang, key.slug)
            ),
            lastmod,
            changefreq: "weekly",
            priority: 0.5,
          });
        }
        for (const legal of site.legalPages) {
          const path = legalPagePath(lang, key.slug, legal.key);
          if (!path) continue;
          urls.push({
            loc: absoluteUrlOnOrigin(origin, omitOwner ? withoutOwnerPrefix(path, lang, key.slug) : path),
            lastmod: legal.updatedAt.toISOString(),
            changefreq: "yearly",
            priority: 0.3,
          });
        }
      }
    }
    return urls;
  }

  private async entitySlugUrls(
    origin: string,
    siteIds: string[],
    entityType: (typeof SlugEntityType)[keyof typeof SlugEntityType],
    pathFn: (lang: string, siteKey: string, slug: string) => string,
    changefreq: SitemapUrl["changefreq"],
    priority: number,
    opts?: { excludeOwnCustomDomain?: boolean; omitOwner?: boolean }
  ): Promise<SitemapUrl[]> {
    if (siteIds.length === 0) return [];

    const slugs = await this.prisma.slug.findMany({
      where: {
        entityType,
        isActive: true,
        isPrimary: true,
        redirectToId: null,
        siteId: { in: siteIds },
        site: { isActive: true },
      },
      select: {
        lang: true,
        slug: true,
        entityId: true,
        updatedAt: true,
        site: {
          select: {
            languages: true,
            siteKeys: {
              where: { isActive: true, isPrimary: true, redirectToId: null },
              select: { lang: true, slug: true },
            },
          },
        },
      },
    });

    const activeIds = await this.activeEntityIds(
      entityType,
      slugs.map((s) => s.entityId),
      opts?.excludeOwnCustomDomain === true
    );

    const urls: SitemapUrl[] = [];
    for (const row of slugs) {
      if (!activeIds.has(row.entityId)) continue;
      if (!row.site.languages.includes(row.lang)) continue;
      const siteKey = row.site.siteKeys.find((k) => k.lang === row.lang)?.slug;
      if (!siteKey) continue;
      const path = pathFn(row.lang, siteKey, row.slug);
      urls.push({
        loc: absoluteUrlOnOrigin(
          origin,
          opts?.omitOwner ? withoutOwnerPrefix(path, row.lang, siteKey) : path
        ),
        lastmod: row.updatedAt.toISOString(),
        changefreq,
        priority,
      });
    }
    return urls;
  }

  private async activeEntityIds(
    entityType: (typeof SlugEntityType)[keyof typeof SlugEntityType],
    ids: string[],
    excludeOwnCustomDomain = false
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const unique = [...new Set(ids)];
    switch (entityType) {
      case SlugEntityType.place: {
        const rows = await this.prisma.place.findMany({
          where: {
            id: { in: unique },
            isActive: true,
            isCrawlable: true,
            ...(excludeOwnCustomDomain ? { customDomain: null } : {}),
          },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.event: {
        const rows = await this.prisma.event.findMany({
          where: { id: { in: unique }, isActive: true, isCrawlable: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.town: {
        const rows = await this.prisma.town.findMany({
          where: {
            id: { in: unique },
            isActive: true,
            isCrawlable: true,
            ...(excludeOwnCustomDomain ? { customDomain: null } : {}),
          },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.page: {
        const rows = await this.prisma.staticPage.findMany({
          where: { id: { in: unique }, isActive: true, isCrawlable: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      default:
        return new Set();
    }
  }

  private async collectionUrls(origin: string): Promise<SitemapUrl[]> {
    // Platform host: only collections without their own custom domain.
    const collections = await this.prisma.collection.findMany({
      where: { isActive: true, isCrawlable: true, domain: null },
      select: { slug: true, updatedAt: true, translations: { select: { lang: true } } },
    });
    return this.collectionRowsToUrls(origin, collections);
  }

  private async collectionHostUrls(
    scope: Extract<SitemapScope, { kind: "collection" }>
  ): Promise<SitemapUrl[]> {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: scope.collectionId,
        isActive: true,
        isCrawlable: true,
      },
      select: { slug: true, updatedAt: true, translations: { select: { lang: true } } },
    });
    if (!collection) return [];
    return this.collectionRowsToUrls(scope.origin, [collection], true);
  }

  private collectionRowsToUrls(
    origin: string,
    collections: Array<{
      slug: string;
      updatedAt: Date;
      translations: Array<{ lang: string }>;
    }>,
    onOwnHost = false
  ): SitemapUrl[] {
    const urls: SitemapUrl[] = [];
    for (const collection of collections) {
      const langs = collection.translations.map((t) => t.lang);
      const targets = langs.length > 0 ? langs : PUBLIC_LANGS;
      for (const lang of targets) {
        urls.push({
          loc: absoluteUrlOnOrigin(origin, onOwnHost ? `/${lang}` : collectionPath(lang, collection.slug)),
          lastmod: collection.updatedAt.toISOString(),
          changefreq: "weekly",
          priority: 0.6,
        });
      }
    }
    return urls;
  }

  /** Town custom domain: root + entity path(s) on that origin only. */
  private async townEntityHostUrls(
    scope: Extract<SitemapScope, { kind: "town" }>
  ): Promise<SitemapUrl[]> {
    const town = await this.prisma.town.findFirst({
      where: { id: scope.townId, isActive: true, isCrawlable: true },
      select: {
        updatedAt: true,
        site: {
          select: {
            languages: true,
            siteKeys: {
              where: { isActive: true, isPrimary: true, redirectToId: null },
              select: { lang: true, slug: true },
            },
          },
        },
      },
    });
    if (!town) return [];
    if (!town.site) return [{ loc: scope.origin + "/", changefreq: "weekly", priority: 1.0 }];

    const urls: SitemapUrl[] = [
      {
        loc: absoluteUrlOnOrigin(scope.origin, "/"),
        lastmod: town.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 1.0,
      },
    ];
    for (const lang of town.site.languages) {
      const siteKey = town.site.siteKeys.find((k) => k.lang === lang)?.slug;
      if (!siteKey) continue;
      const slug = await this.scopeResolver.primaryEntitySlug(
        scope.siteId,
        SlugEntityType.town,
        scope.townId,
        lang
      );
      if (!slug) continue;
      urls.push({
        loc: absoluteUrlOnOrigin(scope.origin, `/${lang}`),
        lastmod: town.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 0.9,
      });
    }
    return urls;
  }

  /** Place custom domain: root + entity path(s) on that origin only. */
  private async placeEntityHostUrls(
    scope: Extract<SitemapScope, { kind: "place" }>
  ): Promise<SitemapUrl[]> {
    const place = await this.prisma.place.findFirst({
      where: { id: scope.placeId, isActive: true, isCrawlable: true },
      select: {
        updatedAt: true,
        site: {
          select: {
            languages: true,
            siteKeys: {
              where: { isActive: true, isPrimary: true, redirectToId: null },
              select: { lang: true, slug: true },
            },
          },
        },
      },
    });
    if (!place) return [];
    if (!place.site) return [{ loc: scope.origin + "/", changefreq: "weekly", priority: 1.0 }];

    const urls: SitemapUrl[] = [
      {
        loc: absoluteUrlOnOrigin(scope.origin, "/"),
        lastmod: place.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 1.0,
      },
    ];
    for (const lang of place.site.languages) {
      const siteKey = place.site.siteKeys.find((k) => k.lang === lang)?.slug;
      if (!siteKey) continue;
      const slug = await this.scopeResolver.primaryEntitySlug(
        scope.siteId,
        SlugEntityType.place,
        scope.placeId,
        lang
      );
      if (!slug) continue;
      urls.push({
        loc: absoluteUrlOnOrigin(scope.origin, `/${lang}`),
        lastmod: place.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: 0.9,
      });
    }
    return urls;
  }

  private toUrlSetXml(urls: SitemapUrl[]): string {
    const body = urls
      .map((u) => {
        const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
        if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
        if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
        if (u.priority != null) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
        return `  <url>\n${parts.join("\n")}\n  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

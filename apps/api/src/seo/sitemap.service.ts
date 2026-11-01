import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SlugEntityType } from "@prisma/client";
import {
  PUBLIC_LANGS,
  absolutePublicUrl,
  collectionPath,
  eventDetailPath,
  frontendOrigin,
  legalPagePath,
  overviewPath,
  placeDetailPath,
  platformPricingPath,
  productsPath,
  regionListPath,
  siteHomePath,
  staticPagePath,
  staticPagesListPath,
  townDetailPath,
} from "./public-path.util";

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

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  chunks(): readonly SitemapChunk[] {
    return SITEMAP_CHUNKS;
  }

  async buildIndexXml(): Promise<string> {
    const origin = frontendOrigin();
    const now = new Date().toISOString();
    const entries = SITEMAP_CHUNKS.map(
      (chunk) => `  <sitemap>
    <loc>${escapeXml(`${origin}/sitemap-${chunk}.xml`)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    ).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
  }

  async buildChunkXml(chunk: string): Promise<string> {
    if (!SITEMAP_CHUNKS.includes(chunk as SitemapChunk)) {
      throw new NotFoundException(`Unknown sitemap chunk: ${chunk}`);
    }
    const urls = await this.urlsForChunk(chunk as SitemapChunk);
    return this.toUrlSetXml(urls);
  }

  private async urlsForChunk(chunk: SitemapChunk): Promise<SitemapUrl[]> {
    switch (chunk) {
      case "static":
        return this.staticPlatformUrls();
      case "sites":
        return this.siteUrls();
      case "places":
        return this.entitySlugUrls(SlugEntityType.place, placeDetailPath, "weekly", 0.8);
      case "events":
        return this.entitySlugUrls(SlugEntityType.event, eventDetailPath, "daily", 0.7);
      case "towns":
        return this.entitySlugUrls(SlugEntityType.town, townDetailPath, "weekly", 0.7);
      case "pages":
        return this.entitySlugUrls(SlugEntityType.page, staticPagePath, "monthly", 0.6);
      case "collections":
        return this.collectionUrls();
      default:
        return [];
    }
  }

  private staticPlatformUrls(): SitemapUrl[] {
    const urls: SitemapUrl[] = [];
    for (const lang of PUBLIC_LANGS) {
      urls.push({
        loc: absolutePublicUrl(overviewPath(lang)),
        changefreq: "weekly",
        priority: 0.9,
      });
      urls.push({
        loc: absolutePublicUrl(regionListPath(lang)),
        changefreq: "daily",
        priority: 0.9,
      });
      urls.push({
        loc: absolutePublicUrl(platformPricingPath(lang)),
        changefreq: "monthly",
        priority: 0.5,
      });
      urls.push({
        loc: absolutePublicUrl(`/${lang}`),
        changefreq: "daily",
        priority: 1.0,
      });
    }
    return urls;
  }

  private async siteUrls(): Promise<SitemapUrl[]> {
    const sites = await this.prisma.site.findMany({
      where: { isActive: true },
      select: {
        id: true,
        updatedAt: true,
        languages: true,
        siteKeys: {
          where: { isActive: true, isPrimary: true, redirectToId: null },
          select: { lang: true, slug: true },
        },
        legalPages: {
          where: { isActive: true },
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
        urls.push({
          loc: absolutePublicUrl(siteHomePath(lang, key.slug)),
          lastmod,
          changefreq: "daily",
          priority: 0.9,
        });
        urls.push({
          loc: absolutePublicUrl(productsPath(lang, key.slug)),
          lastmod,
          changefreq: "weekly",
          priority: 0.5,
        });
        urls.push({
          loc: absolutePublicUrl(staticPagesListPath(lang, key.slug)),
          lastmod,
          changefreq: "weekly",
          priority: 0.5,
        });
        for (const legal of site.legalPages) {
          const path = legalPagePath(lang, key.slug, legal.key);
          if (!path) continue;
          urls.push({
            loc: absolutePublicUrl(path),
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
    entityType: (typeof SlugEntityType)[keyof typeof SlugEntityType],
    pathFn: (lang: string, siteKey: string, slug: string) => string,
    changefreq: SitemapUrl["changefreq"],
    priority: number
  ): Promise<SitemapUrl[]> {
    const slugs = await this.prisma.slug.findMany({
      where: {
        entityType,
        isActive: true,
        isPrimary: true,
        redirectToId: null,
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
      slugs.map((s) => s.entityId)
    );

    const urls: SitemapUrl[] = [];
    for (const row of slugs) {
      if (!activeIds.has(row.entityId)) continue;
      if (!row.site.languages.includes(row.lang)) continue;
      const siteKey = row.site.siteKeys.find((k) => k.lang === row.lang)?.slug;
      if (!siteKey) continue;
      urls.push({
        loc: absolutePublicUrl(pathFn(row.lang, siteKey, row.slug)),
        lastmod: row.updatedAt.toISOString(),
        changefreq,
        priority,
      });
    }
    return urls;
  }

  private async activeEntityIds(
    entityType: (typeof SlugEntityType)[keyof typeof SlugEntityType],
    ids: string[]
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const unique = [...new Set(ids)];
    switch (entityType) {
      case SlugEntityType.place: {
        const rows = await this.prisma.place.findMany({
          where: { id: { in: unique }, isActive: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.event: {
        const rows = await this.prisma.event.findMany({
          where: { id: { in: unique }, isActive: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.town: {
        const rows = await this.prisma.town.findMany({
          where: { id: { in: unique }, isActive: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      case SlugEntityType.page: {
        const rows = await this.prisma.staticPage.findMany({
          where: { id: { in: unique }, isActive: true },
          select: { id: true },
        });
        return new Set(rows.map((r) => r.id));
      }
      default:
        return new Set();
    }
  }

  private async collectionUrls(): Promise<SitemapUrl[]> {
    const collections = await this.prisma.collection.findMany({
      where: { isActive: true, isCrawlable: true },
      select: { slug: true, updatedAt: true, translations: { select: { lang: true } } },
    });
    const urls: SitemapUrl[] = [];
    for (const collection of collections) {
      const langs = collection.translations.map((t) => t.lang);
      const targets = langs.length > 0 ? langs : PUBLIC_LANGS;
      for (const lang of targets) {
        urls.push({
          loc: absolutePublicUrl(collectionPath(lang, collection.slug)),
          lastmod: collection.updatedAt.toISOString(),
          changefreq: "weekly",
          priority: 0.6,
        });
      }
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

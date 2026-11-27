/**
 * Host-scoped robots.txt builder (proxied onto the public host by apps/web/server.js).
 *
 * GSC URL Inspection treats `Disallow: /` and `/*` patterns as a full block and
 * ignores longer Allow exceptions. Rules below are concrete paths only:
 * indexable URLs are Allow, each non-indexable entity is its own Disallow.
 */
import { Injectable } from "@nestjs/common";
import { SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { PathSegmentsService } from "../ui-copy/path-segments.service";
import type { PathSegmentKey } from "../ui-copy/path-segment.dict";
import { allowsCrawl } from "./crawlability";
import {
  guideLangsForSitemapHost,
  isProductionSeoEnvironment,
  legalPagePath,
  withoutOwnerPrefix,
} from "./public-path.util";
import { SitemapScopeResolver, type SitemapScope } from "./sitemap-scope";

/**
 * OG / share scrapers. Meta's Sharing Debugger treats a matching `Disallow`
 * as HTTP 403 — give these UAs an explicit Allow group (and empty Disallow,
 * which some Meta parsers accept more reliably than Allow alone).
 */
const SOCIAL_PREVIEW_BOTS = [
  "facebookexternalhit",
  "Facebot",
  "meta-externalagent",
  "meta-externalfetcher",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
] as const;

type SiteRow = {
  id: string;
  isCrawlable: boolean;
  languages: string[];
  siteKeys: { lang: string; slug: string }[];
};

function socialPreviewAllowBlock(): string[] {
  const lines: string[] = [
    "# Social / OG preview scrapers (Meta reports robots Disallow as 403)",
  ];
  for (const ua of SOCIAL_PREVIEW_BOTS) {
    lines.push(`User-agent: ${ua}`, "Allow: /", "");
  }
  return lines;
}

/** True when `disallow` would also match an Allow path (drop the disallow). */
function blocksAllow(disallow: string, allow: string): boolean {
  const dExact = disallow.endsWith("$");
  const aExact = allow.endsWith("$");
  const d = (dExact ? disallow.slice(0, -1) : disallow).replace(/\/$/, "");
  const a = (aExact ? allow.slice(0, -1) : allow).replace(/\/$/, "");
  if (!d || !a) return false;
  if (dExact) return d === a;
  if (a === d || a.startsWith(`${d}/`)) return true;
  if (!aExact && d.startsWith(`${a}/`)) return true;
  return false;
}

function exactAndChildren(path: string): string[] {
  const base = path.replace(/\/$/, "");
  if (!base || base === "/") return [];
  return [`${base}$`, `${base}/`];
}

@Injectable()
export class RobotsService {
  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
    private readonly pathSegments: PathSegmentsService,
    private readonly scopeResolver: SitemapScopeResolver
  ) {}

  /**
   * Non-prod: Disallow all.
   * Prod, nothing indexable (global off and landing off, or unknown host): Disallow all.
   * Otherwise: explicit Allow for indexable URLs, explicit Disallow per non-indexable
   * entity. No catch-all `Disallow: /` and no `*` patterns — those make GSC report
   * every URL, including guides, as blocked.
   * Admin, /api/ and /offline are always Disallow. Social preview bots stay Allow: /.
   */
  async buildRobotsTxt(scope: SitemapScope): Promise<string> {
    if (!isProductionSeoEnvironment()) {
      return ["# HelloLocal — non-production: indexing disabled", "User-agent: *", "Disallow: /", ""].join(
        "\n"
      );
    }

    const globalOn = await this.platformSettings.getGlobalCrawlability();
    const landingOn = await this.platformSettings.getLandingCrawlability();
    const sitemapLine = `Sitemap: ${scope.origin}/sitemap.xml`;

    const nothingIndexable = scope.kind === "unknown" || (!globalOn && !(scope.kind === "platform" && landingOn));
    if (nothingIndexable) {
      return [
        "# HelloLocal — crawling disabled (social OG scrapers allowed)",
        ...socialPreviewAllowBlock(),
        "User-agent: *",
        "Disallow: /",
        "",
        sitemapLine,
        "",
      ].join("\n");
    }

    const { allows, disallows } = await this.entityRules(scope, globalOn, landingOn);
    const lines = [
      "# HelloLocal robots.txt — indexable paths allowed, other entities disallowed",
      ...socialPreviewAllowBlock(),
      "User-agent: Googlebot",
      "User-agent: Google-InspectionTool",
      "User-agent: *",
      ...allows.map((path) => `Allow: ${path}`),
      ...disallows.map((path) => `Disallow: ${path}`),
      "",
      sitemapLine,
      "",
    ];
    return lines.join("\n");
  }

  private async entityRules(
    scope: SitemapScope,
    globalOn: boolean,
    landingOn: boolean
  ): Promise<{ allows: string[]; disallows: string[] }> {
    const payload = await this.pathSegments.getPayload();
    const langs = payload.languages.length ? payload.languages : ["hu", "en", "de"];
    const allows = new Set<string>();
    const disallows = new Set<string>(this.privatePaths(langs));

    if (scope.kind === "platform") {
      const guideLangs = guideLangsForSitemapHost(scope.origin, langs);
      const guides = await this.prisma.platformGuide.findMany({
        where: { isPublished: true },
        select: { slug: true, translations: { select: { lang: true, slug: true } } },
      });
      if (landingOn) {
        allows.add("/$");
        for (const lang of langs) allows.add(`/${lang}$`);
      }
      for (const lang of guideLangs) {
        const seg = await this.pathSegments.guideSegment(lang);
        const folder = `/${lang}/${seg}`;
        if (!landingOn) {
          for (const rule of exactAndChildren(folder)) disallows.add(rule);
          continue;
        }
        allows.add(`${folder}$`);
        allows.add(`${folder}/`);
        for (const guide of guides) {
          const slug =
            guide.translations.find((row) => row.lang === lang && row.slug?.trim())?.slug?.trim() ||
            guide.slug;
          allows.add(`${folder}/${slug}`);
        }
      }
    }

    if (scope.kind === "platform" && !globalOn) {
      for (const lang of langs) {
        const regionSeg = await this.pathSegments.segmentFor(lang, "regionList");
        const pricingSeg = await this.pathSegments.segmentFor(lang, "pricing");
        for (const path of exactAndChildren(`/${lang}/${regionSeg}`)) disallows.add(path);
        for (const path of exactAndChildren(`/${lang}/${pricingSeg}`)) disallows.add(path);
      }
    }

    if (scope.kind === "collection") {
      const collection = await this.prisma.collection.findUnique({
        where: { id: scope.collectionId },
        select: { isCrawlable: true, isActive: true, slug: true },
      });
      const on = Boolean(collection?.isActive) && allowsCrawl(globalOn, collection?.isCrawlable);
      if (!on) {
        for (const lang of langs) {
          for (const path of exactAndChildren(`/${lang}`)) disallows.add(path);
        }
      }
      return this.finish(allows, disallows);
    }

    if (scope.kind === "event") {
      const event = await this.prisma.event.findUnique({
        where: { id: scope.eventId },
        select: { isActive: true, isCrawlable: true },
      });
      const on = Boolean(event?.isActive) && allowsCrawl(globalOn, event?.isCrawlable);
      if (on) allows.add(`/${scope.domainLang}$`);
      else {
        for (const path of exactAndChildren(`/${scope.domainLang}`)) disallows.add(path);
      }
      return this.finish(allows, disallows);
    }

    const siteIds =
      scope.kind === "platform"
        ? await this.scopeResolver.platformTenantSiteIds()
        : scope.kind === "site" || scope.kind === "town" || scope.kind === "place"
          ? [scope.siteId]
          : [];
    const omitOwner = scope.kind === "site" || scope.kind === "town" || scope.kind === "place";

    if (scope.kind === "platform") {
      const collections = await this.prisma.collection.findMany({
        where: { isActive: true, domain: null },
        select: { slug: true, isCrawlable: true, translations: { select: { lang: true } } },
      });
      for (const collection of collections) {
        const on = allowsCrawl(globalOn, collection.isCrawlable);
        const colLangs = collection.translations.map((row) => row.lang);
        const useLangs = colLangs.length ? colLangs : langs;
        for (const lang of useLangs) {
          const path = `/${lang}/collections/${collection.slug}`;
          if (on) allows.add(path);
          else for (const rule of exactAndChildren(path)) disallows.add(rule);
        }
      }
    }

    const sites = siteIds.length
      ? await this.prisma.site.findMany({
          where: { id: { in: siteIds }, isActive: true },
          select: {
            id: true,
            isCrawlable: true,
            languages: true,
            siteKeys: {
              where: { isActive: true, isPrimary: true, redirectToId: null },
              select: { lang: true, slug: true },
            },
          },
        })
      : [];

    for (const site of sites) {
      const siteOn = allowsCrawl(globalOn, site.isCrawlable);
      for (const key of site.siteKeys) {
        if (!site.languages.includes(key.lang)) continue;
        const home = omitOwner ? `/${key.lang}` : `/${key.lang}/${key.slug}`;
        if (siteOn) allows.add(`${home}$`);
        else for (const rule of exactAndChildren(home)) disallows.add(rule);
      }
      await this.childEntityRules(site, siteOn, globalOn, omitOwner, allows, disallows);
    }

    return this.finish(allows, disallows);
  }

  /** Admin, API and offline are never crawlable. No `*` patterns. */
  private privatePaths(langs: string[]): string[] {
    const paths = ["/admin", "/admin/", "/api/", "/offline", "/offline/"];
    for (const lang of langs) {
      paths.push(`/${lang}/admin`, `/${lang}/admin/`, `/${lang}/offline`, `/${lang}/offline/`);
    }
    return paths;
  }

  private finish(allows: Set<string>, disallows: Set<string>): { allows: string[]; disallows: string[] } {
    const allowList = [...allows].filter(Boolean).sort();
    const disallowList = [...disallows]
      .filter((rule) => rule && !allowList.some((allow) => blocksAllow(rule, allow)))
      .sort();
    return { allows: allowList, disallows: disallowList };
  }

  /**
   * Per-entity crawl flag. When the site itself is off, a child that is on gets
   * a longer Allow. When the site is on, a child that is off gets its own Disallow.
   * Global off forces every child off, so the site prefix is enough.
   */
  private async childEntityRules(
    site: SiteRow,
    siteOn: boolean,
    globalOn: boolean,
    omitOwner: boolean,
    allows: Set<string>,
    disallows: Set<string>
  ): Promise<void> {
    if (!globalOn) return;
    const wantOn = !siteOn;
    const sink = wantOn ? allows : disallows;

    const places = await this.prisma.place.findMany({
      where: { siteId: site.id, isActive: true, isCrawlable: wantOn },
      select: { id: true },
    });
    for (const path of await this.slugPaths(site, SlugEntityType.place, places.map((row) => row.id), omitOwner, (lang, siteKey, slug) =>
      this.segmentPath(lang, siteKey, "place", slug)
    )) {
      if (wantOn) sink.add(path);
      else for (const rule of exactAndChildren(path)) sink.add(rule);
    }

    const events = await this.prisma.event.findMany({
      where: { siteId: site.id, isActive: true, isCrawlable: wantOn },
      select: { id: true },
    });
    for (const path of await this.slugPaths(site, SlugEntityType.event, events.map((row) => row.id), omitOwner, async (lang, siteKey, slug) =>
      `/${lang}/${siteKey}/event/${slug}`
    )) {
      if (wantOn) sink.add(path);
      else for (const rule of exactAndChildren(path)) sink.add(rule);
    }

    const towns = await this.prisma.town.findMany({
      where: { siteId: site.id, isActive: true, isCrawlable: wantOn },
      select: { id: true },
    });
    for (const path of await this.slugPaths(site, SlugEntityType.town, towns.map((row) => row.id), omitOwner, async (lang, siteKey, slug) =>
      `/${lang}/${siteKey}/${slug}`
    )) {
      if (wantOn) sink.add(path);
      else for (const rule of exactAndChildren(path)) sink.add(rule);
    }

    const pages = await this.prisma.staticPage.findMany({
      where: { siteId: site.id, isActive: true, isCrawlable: wantOn },
      select: { id: true },
    });
    for (const path of await this.slugPaths(site, SlugEntityType.page, pages.map((row) => row.id), omitOwner, async (lang, siteKey, slug) =>
      `/${lang}/${siteKey}/static-page/${slug}`
    )) {
      if (wantOn) sink.add(path);
      else for (const rule of exactAndChildren(path)) sink.add(rule);
    }

    const legals = await this.prisma.legalPage.findMany({
      where: { siteId: site.id, isActive: true, isCrawlable: wantOn },
      select: { key: true },
    });
    for (const legal of legals) {
      for (const key of site.siteKeys) {
        if (!site.languages.includes(key.lang)) continue;
        const full = legalPagePath(key.lang, key.slug, legal.key);
        if (!full) continue;
        const path = omitOwner ? withoutOwnerPrefix(full, key.lang, key.slug) : full;
        if (wantOn) allows.add(path);
        else for (const rule of exactAndChildren(path)) disallows.add(rule);
      }
    }
  }

  private async segmentPath(lang: string, siteKey: string, key: PathSegmentKey, slug: string): Promise<string> {
    const seg = await this.pathSegments.segmentFor(lang, key);
    return `/${lang}/${siteKey}/${seg}/${slug}`;
  }

  private async slugPaths(
    site: SiteRow,
    entityType: SlugEntityType,
    ids: string[],
    omitOwner: boolean,
    pathFor: (lang: string, siteKey: string, slug: string) => Promise<string>
  ): Promise<string[]> {
    if (!ids.length) return [];
    const slugs = await this.prisma.slug.findMany({
      where: {
        siteId: site.id,
        entityType,
        entityId: { in: ids },
        isActive: true,
        isPrimary: true,
        redirectToId: null,
      },
      select: { lang: true, slug: true },
    });
    const paths: string[] = [];
    for (const row of slugs) {
      if (!site.languages.includes(row.lang)) continue;
      const siteKey = site.siteKeys.find((key) => key.lang === row.lang)?.slug;
      if (!siteKey) continue;
      const full = await pathFor(row.lang, siteKey, row.slug);
      paths.push(omitOwner ? withoutOwnerPrefix(full, row.lang, siteKey) : full);
    }
    return paths;
  }
}

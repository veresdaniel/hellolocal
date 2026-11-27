/**
 * Host-scoped robots.txt builder (proxied onto the public host by apps/web/server.js).
 */
import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { PathSegmentsService } from "../ui-copy/path-segments.service";
import { guideLangsForSitemapHost, isProductionSeoEnvironment } from "./public-path.util";
import type { SitemapScope } from "./sitemap-scope";

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

function socialPreviewAllowBlock(): string[] {
  const lines: string[] = [
    "# Social / OG preview scrapers (Meta reports robots Disallow as 403)",
  ];
  for (const ua of SOCIAL_PREVIEW_BOTS) {
    // Allow only — no empty `Disallow:` line (some Meta parsers treat it as block).
    lines.push(`User-agent: ${ua}`, "Allow: /", "");
  }
  return lines;
}

@Injectable()
export class RobotsService {
  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly pathSegments: PathSegmentsService
  ) {}

  /**
   * Landing-only rules for User-agent: * (and Google inspection/search tokens).
   * Allow lines come *before* `Disallow: /` — GSC URL Inspection / some parsers
   * still behave like first-match, so a leading Disallow blocks every URL.
   * Guide Allows are plain prefixes (no `$`) so `/de/ratgeber/slug` is covered.
   */
  private async landingOnlyStarBlock(origin: string): Promise<string[]> {
    const payload = await this.pathSegments.getPayload();
    const allLangs = payload.languages.length ? payload.languages : ["hu", "en", "de"];
    const guideLangs = guideLangsForSitemapHost(origin, payload.languages);
    // Exact homes only (`$`); guides are prefix Allows without end-anchor.
    const allowHomes = allLangs.map((lang) => `Allow: /${lang}$`);
    const allowGuides: string[] = [];
    for (const lang of guideLangs) {
      const seg = await this.pathSegments.guideSegment(lang);
      allowGuides.push(`Allow: /${lang}/${seg}`);
    }
    const allowLines = ["Allow: /$", ...allowHomes, ...allowGuides];
    // Explicit Google tokens so URL Inspection does not fall through a bad `*` parse.
    return [
      "User-agent: Googlebot",
      "User-agent: Google-InspectionTool",
      ...allowLines,
      "Disallow: /",
      "",
      "User-agent: *",
      ...allowLines,
      "Disallow: /",
    ];
  }

  /**
   * Non-prod (local/staging/beta/devel): always Disallow all, no Sitemap line.
   * Prod:
   * - Global on → Allow / (admin/api still Disallow)
   * - Global off + platform landing on → * may crawl apex + `/:lang` only;
   *   every other path stays Disallow for search bots
   * - Global off otherwise → * Disallow all
   * Social / OG scrapers always get Allow: / on known hosts when * is restricted,
   * so Facebook can preview any shared URL (landing, list, place, custom domain) —
   * not only the marketing landing.
   * Unknown hosts: Disallow all (no social exception).
   * @param scope From {@link SitemapScopeResolver} (Host / X-Forwarded-Host)
   */
  async buildRobotsTxt(scope: SitemapScope): Promise<string> {
    if (!isProductionSeoEnvironment()) {
      return [
        "# HelloLocal — non-production: indexing disabled",
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n");
    }

    const globalOn = await this.platformSettings.getGlobalCrawlability();
    const landingOn = await this.platformSettings.getLandingCrawlability();
    const sitemapLine = `Sitemap: ${scope.origin}/sitemap.xml`;

    if (scope.kind === "unknown") {
      return [
        "# HelloLocal — crawling disabled",
        "User-agent: *",
        "Disallow: /",
        "",
        sitemapLine,
        "",
      ].join("\n");
    }

    // Search indexing off: keep * tight, but always let OG scrapers fetch any path
    // (platform + custom domains — place/event/list shares, not just the landing).
    if (!globalOn) {
      if (scope.kind === "platform" && landingOn) {
        return [
          "# HelloLocal robots.txt — platform landing only (global indexing off)",
          ...socialPreviewAllowBlock(),
          ...(await this.landingOnlyStarBlock(scope.origin)),
          "",
          sitemapLine,
          "",
        ].join("\n");
      }
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

    return [
      "# HelloLocal robots.txt (auto-generated, host-scoped)",
      "User-agent: *",
      "Allow: /",
      "",
      "# Admin / auth (all locales)",
      "Disallow: /admin",
      "Disallow: /admin/",
      "Disallow: /*/admin",
      "Disallow: /*/admin/",
      "",
      "# Private / non-public surfaces",
      "Disallow: /api/",
      "Disallow: /*/offline",
      "Disallow: /offline",
      "",
      sitemapLine,
      "",
    ].join("\n");
  }
}

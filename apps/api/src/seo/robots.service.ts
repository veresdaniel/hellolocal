/**
 * Host-scoped robots.txt builder (proxied onto the public host by apps/web/server.js).
 */
import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { isProductionSeoEnvironment } from "./public-path.util";
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
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  /**
   * Public crawl: Allow `/`, block only admin/api/offline.
   * Do not add `Disallow: /` — GSC URL Inspection treats it as a full block and
   * ignores longer Allow exceptions (guides, language homes, and `/` itself).
   * What stays out of the index when global crawl is off is sitemap omission
   * plus page-level noindex, not a catch-all robots rule.
   */
  private openCrawlLines(): string[] {
    return [
      "User-agent: *",
      "# Admin / auth (all locales)",
      "Disallow: /admin",
      "Disallow: /admin/",
      "Disallow: /*/admin",
      "Disallow: /*/admin/",
      "# Private / non-public surfaces",
      "Disallow: /api/",
      "Disallow: /*/offline",
      "Disallow: /offline",
      "Allow: /",
    ];
  }

  /**
   * Non-prod (local/staging/beta/devel): always Disallow all, no Sitemap line.
   * Prod:
   * - Global on, or global off + platform landing on → Allow / (admin/api still Disallow).
   *   No catch-all `Disallow: /` (GSC treats that as blocking every URL).
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
          "# HelloLocal robots.txt — public crawl (global indexing off, landing on)",
          ...socialPreviewAllowBlock(),
          ...this.openCrawlLines(),
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
      ...this.openCrawlLines(),
      "",
      sitemapLine,
      "",
    ].join("\n");
  }
}

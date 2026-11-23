/**
 * Host-scoped robots.txt builder (proxied onto the public host by apps/web/server.js).
 */
import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { isProductionSeoEnvironment } from "./public-path.util";
import type { SitemapScope } from "./sitemap-scope";

/**
 * Link-preview crawlers. Facebook Sharing Debugger treats a blanket
 * `Disallow: /` as a hard block (reports HTTP 403) even when the HTML itself
 * is reachable — so these agents stay Allow'd when general indexing is off.
 */
const SOCIAL_PREVIEW_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "TelegramBot",
] as const;

function socialPreviewAllowBlock(): string[] {
  const lines: string[] = [
    "# Social / link-preview crawlers (OG tags) — allowed even when indexing is off",
  ];
  for (const agent of SOCIAL_PREVIEW_AGENTS) {
    lines.push(`User-agent: ${agent}`, "Allow: /", "");
  }
  return lines;
}

@Injectable()
export class RobotsService {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  /**
   * Non-prod (local/staging/beta/devel): Disallow all for search engines, but
   * still Allow social preview bots so OG scrapers can be tested.
   * Prod: allow crawl when global crawlability is on; Sitemap: same-host only.
   * Unknown custom hosts and global-off → Disallow all for `*` (Sitemap line
   * still listed in prod); social preview bots remain Allow'd.
   * @param scope From {@link SitemapScopeResolver} (Host / X-Forwarded-Host)
   */
  async buildRobotsTxt(scope: SitemapScope): Promise<string> {
    if (!isProductionSeoEnvironment()) {
      return [
        "# HelloLocal — non-production: indexing disabled",
        ...socialPreviewAllowBlock(),
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n");
    }

    const crawlable = await this.platformSettings.getGlobalCrawlability();
    const sitemapLine = `Sitemap: ${scope.origin}/sitemap.xml`;

    if (!crawlable || scope.kind === "unknown") {
      return [
        "# HelloLocal — crawling disabled (search engines)",
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

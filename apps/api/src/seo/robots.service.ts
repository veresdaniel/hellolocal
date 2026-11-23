/**
 * Host-scoped robots.txt builder (proxied onto the public host by apps/web/server.js).
 */
import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { isProductionSeoEnvironment, PUBLIC_LANGS } from "./public-path.util";
import type { SitemapScope } from "./sitemap-scope";

@Injectable()
export class RobotsService {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  /**
   * Non-prod (local/staging/beta/devel): always Disallow all, no Sitemap line.
   * Prod platform host:
   * - Global on → Allow / (admin/api still Disallow)
   * - Global off + landing on → Allow only apex + `/:lang` landings (rest Disallow)
   * - Global off + landing off → Disallow all
   * Custom/unknown hosts follow global only (landing switch is platform marketing only).
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

    // Platform marketing landing may stay crawlable while global content indexing is off.
    if (!globalOn) {
      if (scope.kind === "platform" && landingOn) {
        return [
          "# HelloLocal robots.txt — platform landing only (global indexing off)",
          "User-agent: *",
          "Allow: /$",
          ...PUBLIC_LANGS.map((lang) => `Allow: /${lang}$`),
          "Disallow: /",
          "",
          sitemapLine,
          "",
        ].join("\n");
      }
      return [
        "# HelloLocal — crawling disabled",
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

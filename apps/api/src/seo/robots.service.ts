import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { isProductionSeoEnvironment } from "./public-path.util";
import type { SitemapScope } from "./sitemap-scope";

@Injectable()
export class RobotsService {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  /**
   * Non-prod (local/staging/beta/devel): always Disallow all, no Sitemap line.
   * Prod: allow crawl when platform crawlability is on; Sitemap: same-host only.
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

    const crawlable = await this.platformSettings.getGlobalCrawlability();
    const sitemapLine = `Sitemap: ${scope.origin}/sitemap.xml`;

    if (!crawlable || scope.kind === "unknown") {
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

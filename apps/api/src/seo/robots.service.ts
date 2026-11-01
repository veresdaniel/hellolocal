import { Injectable } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { frontendOrigin } from "./public-path.util";

@Injectable()
export class RobotsService {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  async buildRobotsTxt(): Promise<string> {
    const origin = frontendOrigin();
    const crawlable = await this.platformSettings.getGlobalCrawlability();

    if (!crawlable) {
      return [
        "# HelloLocal — global crawlability disabled",
        "User-agent: *",
        "Disallow: /",
        "",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n");
    }

    return [
      "# HelloLocal robots.txt (auto-generated)",
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
      `Sitemap: ${origin}/sitemap.xml`,
      "",
    ].join("\n");
  }
}

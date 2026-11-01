// src/seo/seo.module.ts
import { Module } from "@nestjs/common";
import { SeoController } from "./seo.controller";
import { SeoCrawlController } from "./seo-crawl.controller";
import { SitemapService } from "./sitemap.service";
import { SitemapScopeResolver } from "./sitemap-scope";
import { RobotsService } from "./robots.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SlugModule } from "../slug/slug.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";

@Module({
  imports: [PrismaModule, SiteModule, SlugModule, PlatformSettingsModule],
  controllers: [SeoCrawlController, SeoController],
  providers: [SitemapService, SitemapScopeResolver, RobotsService],
  exports: [SitemapService],
})
export class SeoModule {}

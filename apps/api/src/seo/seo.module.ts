// src/seo/seo.module.ts
import { Module } from "@nestjs/common";
import { SeoController } from "./seo.controller";
import { SeoCrawlModule } from "./seo-crawl.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SlugModule } from "../slug/slug.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { FacebookOgScrapeService } from "./facebook-og-scrape.service";

@Module({
  imports: [
    PrismaModule,
    SiteModule,
    SlugModule,
    PlatformSettingsModule,
    SeoCrawlModule,
  ],
  controllers: [SeoController],
  providers: [FacebookOgScrapeService],
  exports: [SeoCrawlModule, FacebookOgScrapeService],
})
export class SeoModule {}

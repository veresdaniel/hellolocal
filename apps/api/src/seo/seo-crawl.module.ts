import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { UiCopyModule } from "../ui-copy/ui-copy.module";
import { SeoCrawlController } from "./seo-crawl.controller";
import { SitemapService } from "./sitemap.service";
import { SitemapScopeResolver } from "./sitemap-scope";
import { RobotsService } from "./robots.service";

/**
 * Host-scoped robots/sitemap without SiteModule — keeps AdminModule free of
 * SeoModule ↔ SiteModule ↔ PlacesModule cycles.
 */
@Module({
  imports: [PrismaModule, PlatformSettingsModule, forwardRef(() => UiCopyModule)],
  controllers: [SeoCrawlController],
  providers: [SitemapService, SitemapScopeResolver, RobotsService],
  exports: [SitemapService],
})
export class SeoCrawlModule {}

// src/seo/seo.module.ts
import { Module } from "@nestjs/common";
import { SeoController } from "./seo.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SlugModule } from "../slug/slug.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";

@Module({
  imports: [PrismaModule, SiteModule, SlugModule, PlatformSettingsModule],
  controllers: [SeoController],
})
export class SeoModule {}

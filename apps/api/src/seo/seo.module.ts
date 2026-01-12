// src/seo/seo.module.ts
import { Module } from "@nestjs/common";
import { SeoController } from "./seo.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { SlugModule } from "../slug/slug.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";

@Module({
  imports: [PrismaModule, TenantModule, SlugModule, PlatformSettingsModule],
  controllers: [SeoController],
})
export class SeoModule {}


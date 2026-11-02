// src/app-settings/app-settings.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SeoCrawlModule } from "../seo/seo-crawl.module";
import { AppSettingsController } from "./app-settings.controller";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

@Module({
  imports: [PrismaModule, SeoCrawlModule],
  controllers: [AppSettingsController],
  providers: [AdminAppSettingsService],
  exports: [AdminAppSettingsService],
})
export class AppSettingsModule {}

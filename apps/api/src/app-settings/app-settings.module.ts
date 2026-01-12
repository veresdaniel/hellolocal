// src/app-settings/app-settings.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AppSettingsController } from "./app-settings.controller";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

@Module({
  imports: [PrismaModule],
  controllers: [AppSettingsController],
  providers: [AdminAppSettingsService],
  exports: [AdminAppSettingsService],
})
export class AppSettingsModule {}
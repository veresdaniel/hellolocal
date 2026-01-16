import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import {
  PlatformSettingsController,
  PublicPlatformSettingsController,
  AdminPlatformSettingsController,
} from "./platform-settings.controller";
import { PlatformSettingsService } from "./platform-settings.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PlatformSettingsController,
    PublicPlatformSettingsController,
    AdminPlatformSettingsController,
  ],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}

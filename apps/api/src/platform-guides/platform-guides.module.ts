import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SeoCrawlModule } from "../seo/seo-crawl.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import {
  AdminPlatformGuidesController,
  PlatformGuidesController,
} from "./platform-guides.controller";
import { PlatformGuidesService } from "./platform-guides.service";

@Module({
  imports: [PrismaModule, AuthModule, SeoCrawlModule, PlatformSettingsModule],
  controllers: [PlatformGuidesController, AdminPlatformGuidesController],
  providers: [PlatformGuidesService],
})
export class PlatformGuidesModule {}

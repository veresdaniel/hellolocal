import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SitesController } from "./sites.controller";
import { SitesPublicController } from "./sites-public.controller";
import { SitesService } from "./sites.service";
import { ConfigModule } from "@nestjs/config";
import { EventLogModule } from "../event-log/event-log.module";

@Module({
  imports: [PrismaModule, SiteModule, ConfigModule, EventLogModule],
  controllers: [SitesController, SitesPublicController],
  providers: [SitesService],
})
export class SitesModule {}

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { SitesController } from "./sites.controller";
import { SitesPublicController } from "./sites-public.controller";
import { SitesService } from "./sites.service";

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [SitesController, SitesPublicController],
  providers: [SitesService],
})
export class SitesModule {}

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { SlugModule } from "../slug/slug.module";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";

@Module({
  imports: [PrismaModule, TenantModule, SlugModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}

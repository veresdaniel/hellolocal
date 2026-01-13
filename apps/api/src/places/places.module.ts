import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { SlugModule } from "../slug/slug.module";
import { PlacesController } from "./places.controller";
import { PlacesPublicController } from "./places-public.controller";
import { PlacesService } from "./places.service";
import { RatingService } from "./rating.service";
import { RatingController } from "./rating.controller";

@Module({
  imports: [PrismaModule, TenantModule, SlugModule],
  controllers: [PlacesController, PlacesPublicController, RatingController],
  providers: [PlacesService, RatingService],
  exports: [PlacesService, RatingService],
})
export class PlacesModule {}

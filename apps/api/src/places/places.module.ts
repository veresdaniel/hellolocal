import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SlugModule } from "../slug/slug.module";
import { PlacesController } from "./places.controller";
import { PlacesPublicController } from "./places-public.controller";
import { PlacesService } from "./places.service";
import { PlacesPriceListService } from "./places-price-list.service";
import { RatingService } from "./rating.service";
import { RatingController } from "./rating.controller";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [PrismaModule, forwardRef(() => SiteModule), SlugModule, forwardRef(() => AdminModule)],
  controllers: [PlacesController, PlacesPublicController, RatingController],
  providers: [PlacesService, PlacesPriceListService, RatingService],
  exports: [PlacesService, PlacesPriceListService, RatingService],
})
export class PlacesModule {}

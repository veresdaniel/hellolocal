import { Module, forwardRef } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsPublicController } from "./events-public.controller";
import { EventsService } from "./events.service";
import { EventRatingService } from "./event-rating.service";
import { EventRatingController } from "./event-rating.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { SlugModule } from "../slug/slug.module";

@Module({
  imports: [PrismaModule, forwardRef(() => SiteModule), SlugModule],
  controllers: [EventsController, EventsPublicController, EventRatingController],
  providers: [EventsService, EventRatingService],
  exports: [EventsService, EventRatingService],
})
export class EventsModule {}


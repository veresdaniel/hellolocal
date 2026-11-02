import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { TownsPublicController } from "./towns-public.controller";
import { TownsPublicService } from "./towns-public.service";
import { CrawlabilityModule } from "../seo/crawlability.module";

@Module({
  imports: [PrismaModule, forwardRef(() => SiteModule), CrawlabilityModule],
  controllers: [TownsPublicController],
  providers: [TownsPublicService],
  exports: [TownsPublicService],
})
export class TownsModule {}

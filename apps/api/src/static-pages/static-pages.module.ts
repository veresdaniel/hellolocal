import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { StaticPagesController } from "./static-pages.controller";
import { StaticPagesPublicController } from "./static-pages-public.controller";
import { StaticPagesService } from "./static-pages.service";

@Module({
  imports: [PrismaModule, SiteModule],
  controllers: [StaticPagesController, StaticPagesPublicController],
  providers: [StaticPagesService],
  exports: [StaticPagesService],
})
export class StaticPagesModule {}

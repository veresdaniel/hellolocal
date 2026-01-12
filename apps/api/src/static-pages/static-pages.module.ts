import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { StaticPagesController } from "./static-pages.controller";
import { StaticPagesPublicController } from "./static-pages-public.controller";
import { StaticPagesService } from "./static-pages.service";

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [StaticPagesController, StaticPagesPublicController],
  providers: [StaticPagesService],
  exports: [StaticPagesService],
})
export class StaticPagesModule {}


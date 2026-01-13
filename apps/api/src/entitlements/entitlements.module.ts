// entitlements.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { EntitlementsService } from "./entitlements.service";
import { PlaceUpsellService } from "./place-upsell.service";
import { EntitlementsController } from "./entitlements.controller";
import { AdminSiteSubscriptionController } from "./subscription.controller";

@Module({
  imports: [PrismaModule, SiteModule],
  controllers: [EntitlementsController, AdminSiteSubscriptionController],
  providers: [EntitlementsService, PlaceUpsellService],
  exports: [EntitlementsService, PlaceUpsellService],
})
export class EntitlementsModule {}

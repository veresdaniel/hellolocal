import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EventLogModule } from "../event-log/event-log.module";
import { AdminController } from "./admin.controller";
import { AdminCategoryService } from "./admin-category.service";
import { AdminTagService } from "./admin-tag.service";
import { AdminPriceBandService } from "./admin-priceband.service";
import { AdminUsersService } from "./admin-users.service";
import { AdminTownService } from "./admin-town.service";
import { AdminPlaceService } from "./admin-place.service";
import { AdminLegalService } from "./admin-legal.service";
import { AdminStaticPageService } from "./admin-static-page.service";
import { AdminSiteService } from "./admin-site.service";
import { AdminAppSettingsService } from "./admin-app-settings.service";
import { AdminEventService } from "./admin-event.service";
import { AdminBrandService } from "./admin-brand.service";
import { AdminSiteInstanceService } from "./admin-site-instance.service";
import { AdminSiteMembershipService } from "./admin-site-membership.service";
import { AdminPlaceMembershipService } from "./admin-place-membership.service";
import { AdminSubscriptionService } from "./admin-subscription.service";
import { AdminGalleryService } from "./admin-gallery.service";
import { GalleryPublicService } from "./gallery-public.service";
import { GalleryPublicController } from "./gallery-public.controller";
import { TwoFactorModule } from "../two-factor/two-factor.module";
import { SiteModule } from "../site/site.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";

@Module({
  imports: [PrismaModule, TwoFactorModule, NotificationsModule, EventLogModule, AuthModule, PlatformSettingsModule, EntitlementsModule, SiteModule],
  controllers: [AdminController, GalleryPublicController],
  providers: [
    AdminCategoryService,
    AdminTagService,
    AdminPriceBandService,
    AdminUsersService,
    AdminTownService,
    AdminPlaceService,
    AdminLegalService,
    AdminStaticPageService,
    AdminSiteService,
    AdminAppSettingsService,
    AdminEventService,
    AdminBrandService,
    AdminSiteInstanceService,
    AdminSiteMembershipService,
    AdminPlaceMembershipService,
    AdminSubscriptionService,
    AdminGalleryService,
    GalleryPublicService,
    // AdminEventLogService is now provided by EventLogModule
  ],
  exports: [
    AdminCategoryService,
    AdminTagService,
    AdminPriceBandService,
    AdminUsersService,
    AdminTownService,
    AdminPlaceService,
    AdminLegalService,
    AdminStaticPageService,
    AdminSiteService,
    AdminAppSettingsService,
    AdminEventService,
    AdminBrandService,
    AdminSiteInstanceService,
    AdminSiteMembershipService,
    AdminPlaceMembershipService,
    AdminSubscriptionService,
    AdminGalleryService,
    // AdminEventLogService is now exported by EventLogModule
  ],
})
export class AdminModule {}


import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminCategoryService } from "./admin-category.service";
import { AdminTagService } from "./admin-tag.service";
import { AdminPriceBandService } from "./admin-priceband.service";
import { AdminUsersService } from "./admin-users.service";
import { AdminTownService } from "./admin-town.service";
import { AdminPlaceService } from "./admin-place.service";
import { AdminLegalService } from "./admin-legal.service";
import { AdminTenantService } from "./admin-tenant.service";
import { AdminAppSettingsService } from "./admin-app-settings.service";
import { TwoFactorModule } from "../two-factor/two-factor.module";

@Module({
  imports: [PrismaModule, TwoFactorModule],
  controllers: [AdminController],
  providers: [
    AdminCategoryService,
    AdminTagService,
    AdminPriceBandService,
    AdminUsersService,
    AdminTownService,
    AdminPlaceService,
    AdminLegalService,
    AdminTenantService,
    AdminAppSettingsService,
  ],
  exports: [
    AdminCategoryService,
    AdminTagService,
    AdminPriceBandService,
    AdminUsersService,
    AdminTownService,
    AdminPlaceService,
    AdminLegalService,
    AdminTenantService,
    AdminAppSettingsService,
  ],
})
export class AdminModule {}


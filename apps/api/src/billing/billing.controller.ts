// apps/api/src/billing/billing.controller.ts
import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";
import { BillingService, PlaceSubscriptionDto, SiteSubscriptionDto } from "./billing.service";
import { RbacService } from "../auth/rbac.service";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

@Controller("/api/admin/billing")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly rbacService: RbacService
  ) {}

  // ==================== Place Subscription ====================

  /**
   * Get place subscription
   */
  @Get("/places/:placeId/subscription")
  async getPlaceSubscription(
    @Param("placeId") placeId: string,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Superadmin and admin have access to all places
    if (user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      // Check if user has place permission (editor level is enough to view)
      const hasPermission = await this.rbacService.hasPlacePermission(
        user.id,
        placeId,
        "editor"
      );
      if (!hasPermission) {
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_VIEW_PLACE_SUBSCRIPTION);
      }
    }

    return this.billingService.getPlaceSubscription(placeId);
  }

  /**
   * Update place subscription
   */
  @Put("/places/:placeId/subscription")
  async updatePlaceSubscription(
    @Param("placeId") placeId: string,
    @Body() data: Partial<Omit<PlaceSubscriptionDto, "placeId">>,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Only superadmin and admin can update subscriptions
    if (user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      throw new ForbiddenException("Only admins can update subscriptions");
    }

    return this.billingService.updatePlaceSubscription(placeId, data, user.id);
  }

  /**
   * Get place entitlements and usage
   */
  @Get("/places/:placeId/entitlements")
  async getPlaceEntitlements(
    @Param("placeId") placeId: string,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Superadmin and admin have access to all places
    if (user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      // Check if user has place permission (editor level is enough to view)
      const hasPermission = await this.rbacService.hasPlacePermission(
        user.id,
        placeId,
        "editor"
      );
      if (!hasPermission) {
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_VIEW_PLACE_ENTITLEMENTS);
      }
    }

    return this.billingService.getPlaceEntitlements(placeId);
  }

  // ==================== Site Subscription ====================

  /**
   * Get site subscription
   */
  @Get("/sites/:siteId/subscription")
  async getSiteSubscription(
    @Param("siteId") siteId: string,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Check if user has access to this site
    if (user.role !== UserRole.superadmin && !user.siteIds.includes(siteId)) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_VIEW_SITE_SUBSCRIPTION);
    }

    return this.billingService.getSiteSubscription(siteId);
  }

  /**
   * Update site subscription
   */
  @Put("/sites/:siteId/subscription")
  async updateSiteSubscription(
    @Param("siteId") siteId: string,
    @Body() data: Partial<Omit<SiteSubscriptionDto, "siteId">>,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Only superadmin can update site subscriptions
    if (user.role !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can update site subscriptions");
    }

    return this.billingService.updateSiteSubscription(siteId, data);
  }

  /**
   * Get site entitlements and usage
   */
  @Get("/sites/:siteId/entitlements")
  async getSiteEntitlements(
    @Param("siteId") siteId: string,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Check if user has access to this site
    if (user.role !== UserRole.superadmin && !user.siteIds.includes(siteId)) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_VIEW_SITE_ENTITLEMENTS);
    }

    return this.billingService.getSiteEntitlements(siteId);
  }
}

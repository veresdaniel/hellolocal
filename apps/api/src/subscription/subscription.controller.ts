// subscription.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SubscriptionService } from "./subscription.service";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

@Controller("/api/:lang/sites")
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService
  ) {}

  /* =========================
     GET SITE SUBSCRIPTION
     ========================= */
  @Get(":siteId/subscription")
  async getSiteSubscription(@Param("siteId") siteId: string) {
    return this.subscriptionService.getForSite(siteId);
  }

  /* =========================
     CANCEL SITE SUBSCRIPTION
     ========================= */
  @Post(":siteId/subscription/:id/cancel")
  @UseGuards(JwtAuthGuard)
  async cancelSite(@Param("id") id: string) {
    return this.subscriptionService.cancel(id, "site");
  }

  /* =========================
     GET PLACE SUBSCRIPTION
     ========================= */
  @Get("places/:placeId/subscription")
  async getPlaceSubscription(@Param("placeId") placeId: string) {
    return this.subscriptionService.getForPlace(placeId);
  }

  /* =========================
     CANCEL PLACE SUBSCRIPTION
     ========================= */
  @Post("places/:placeId/subscription/:id/cancel")
  @UseGuards(JwtAuthGuard)
  async cancelPlace(@Param("id") id: string) {
    return this.subscriptionService.cancel(id, "place");
  }

  /* =========================
     RESUME SITE SUBSCRIPTION
     ========================= */
  @Post(":siteId/subscription/:id/resume")
  @UseGuards(JwtAuthGuard)
  async resumeSite(@Param("id") id: string) {
    return this.subscriptionService.resume(id, "site");
  }

  /* =========================
     RESUME PLACE SUBSCRIPTION
     ========================= */
  @Post("places/:placeId/subscription/:id/resume")
  @UseGuards(JwtAuthGuard)
  async resumePlace(@Param("id") id: string) {
    return this.subscriptionService.resume(id, "place");
  }

  /* =========================
     ENTITLEMENTS (frontend!)
     ========================= */
  @Get("entitlements")
  async entitlements(@Query("siteId") siteId?: string, @Query("placeId") placeId?: string) {
    return this.subscriptionService.getEntitlements({ siteId, placeId });
  }
}

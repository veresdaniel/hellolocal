// subscription.controller.ts
import { Controller, Get, Post, Param, Query, Body, UseGuards, BadRequestException } from "@nestjs/common";
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
     ACTIVATE FREE SITE
     ========================= */
  @Post("activate-free")
  @UseGuards(JwtAuthGuard)
  async activateFree(
    @Param("lang") lang: string,
    @CurrentUser() user: { id: string; email: string }
  ) {
    // Check if user is already a visitor (has no activeSiteId)
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { activeSiteId: true },
    });

    if (!currentUser) {
      throw new BadRequestException("User not found");
    }

    // If user already has an active site, they're not a visitor
    if (currentUser.activeSiteId) {
      throw new BadRequestException("User already has an active site");
    }

    // Get or create default brand
    let brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!brand) {
      // Create default brand if none exists
      brand = await this.prisma.brand.create({
        data: {
          name: "Default Brand",
        },
      });
    }

    // Generate site slug from user email (first part before @)
    const emailPrefix = user.email.split("@")[0];
    const baseSlug = emailPrefix.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    // Ensure unique slug
    let siteSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.site.findUnique({ where: { slug: siteSlug } })) {
      siteSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create site with default translation
    const site = await this.prisma.site.create({
      data: {
        slug: siteSlug,
        brandId: brand.id,
        isActive: true,
        translations: {
          create: {
            lang: lang as Lang,
            name: `${user.email.split("@")[0]}'s Site`,
            shortDescription: null,
            description: null,
          },
        },
      },
    });

    // Create SiteKey for the default language
    await this.prisma.siteKey.create({
      data: {
        siteId: site.id,
        lang: lang as Lang,
        slug: siteSlug,
        isPrimary: true,
        isActive: true,
      },
    });

    // Create SiteInstance for default language
    await this.prisma.siteInstance.create({
      data: {
        siteId: site.id,
        lang: lang as Lang,
        isDefault: true,
      },
    });

    // Create FREE subscription
    await this.prisma.siteSubscription.create({
      data: {
        siteId: site.id,
        plan: "FREE",
        status: "ACTIVE",
        validUntil: null, // Free plan has no expiration
      },
    });

    // Link user to site via UserSite
    await this.prisma.userSite.create({
      data: {
        userId: user.id,
        siteId: site.id,
        isPrimary: true,
      },
    });

    // Update user's activeSiteId
    await this.prisma.user.update({
      where: { id: user.id },
      data: { activeSiteId: site.id },
    });

    return {
      siteId: site.id,
      slug: site.slug,
      message: "Free site activated successfully",
    };
  }

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
  async cancelSite(
    @Param("id") id: string
  ) {
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
  async cancelPlace(
    @Param("id") id: string
  ) {
    return this.subscriptionService.cancel(id, "place");
  }

  /* =========================
     ENTITLEMENTS (frontend!)
     ========================= */
  @Get("entitlements")
  async entitlements(
    @Query("siteId") siteId?: string,
    @Query("placeId") placeId?: string
  ) {
    return this.subscriptionService.getEntitlements({ siteId, placeId });
  }
}

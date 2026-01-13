// apps/api/src/billing/billing.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlacePlan, SitePlan } from "@prisma/client";
import { getPlaceLimits, type PlaceLimits } from "../config/place-limits.config";
import { getSiteLimits, type SiteLimits } from "../config/site-limits.config";

export interface PlaceSubscriptionDto {
  placeId: string;
  plan: PlacePlan;
  isFeatured: boolean;
  featuredUntil: Date | null;
}

export interface SiteSubscriptionDto {
  siteId: string;
  plan: SitePlan;
  planStatus: string | null;
  planValidUntil: Date | null;
  planLimits: Record<string, any> | null;
  billingEmail: string | null;
}

export interface PlaceEntitlementsDto {
  placeId: string;
  plan: PlacePlan;
  limits: PlaceLimits;
  currentUsage: {
    images: number;
    events: number;
    isFeatured: boolean;
    featuredUntil: Date | null;
  };
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export interface SiteEntitlementsDto {
  siteId: string;
  plan: SitePlan;
  limits: SiteLimits;
  currentUsage: {
    places: number;
    featuredPlaces: number;
    events: number;
  };
  canUpgrade: boolean;
  canDowngrade: boolean;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get subscription for a place
   */
  async getPlaceSubscription(placeId: string): Promise<PlaceSubscriptionDto> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        plan: true,
        isFeatured: true,
        featuredUntil: true,
      },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found`);
    }

    return {
      placeId: place.id,
      plan: place.plan,
      isFeatured: place.isFeatured,
      featuredUntil: place.featuredUntil,
    };
  }

  /**
   * Update subscription for a place
   */
  async updatePlaceSubscription(
    placeId: string,
    data: Partial<Omit<PlaceSubscriptionDto, "placeId">>
  ): Promise<PlaceSubscriptionDto> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found`);
    }

    // Validate featured status based on plan
    if (data.isFeatured && data.plan) {
      const limits = getPlaceLimits(data.plan);
      if (!limits.featured) {
        throw new BadRequestException(
          `Plan ${data.plan} does not support featured status`
        );
      }
    }

    const updated = await this.prisma.place.update({
      where: { id: placeId },
      data: {
        plan: data.plan,
        isFeatured: data.isFeatured ?? undefined,
        featuredUntil: data.featuredUntil ?? undefined,
      },
      select: {
        id: true,
        plan: true,
        isFeatured: true,
        featuredUntil: true,
      },
    });

    return {
      placeId: updated.id,
      plan: updated.plan,
      isFeatured: updated.isFeatured,
      featuredUntil: updated.featuredUntil,
    };
  }

  /**
   * Get entitlements and usage for a place
   */
  async getPlaceEntitlements(placeId: string): Promise<PlaceEntitlementsDto> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      include: {
        events: {
          select: { id: true },
        },
      },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found`);
    }

    const limits = getPlaceLimits(place.plan);
    const imageCount = (place.gallery?.length || 0) + (place.heroImage ? 1 : 0);
    const eventCount = place.events?.length || 0;

    // Determine if upgrade/downgrade is possible
    // For now, we allow both (can be restricted later based on business rules)
    const canUpgrade = place.plan !== "pro";
    const canDowngrade = place.plan !== "free";

    return {
      placeId: place.id,
      plan: place.plan,
      limits,
      currentUsage: {
        images: imageCount,
        events: eventCount,
        isFeatured: place.isFeatured,
        featuredUntil: place.featuredUntil,
      },
      canUpgrade,
      canDowngrade,
    };
  }

  /**
   * Get subscription for a site
   */
  async getSiteSubscription(siteId: string): Promise<SiteSubscriptionDto> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        plan: true,
        planStatus: true,
        planValidUntil: true,
        planLimits: true,
        billingEmail: true,
      },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    return {
      siteId: site.id,
      plan: site.plan,
      planStatus: site.planStatus,
      planValidUntil: site.planValidUntil,
      planLimits: site.planLimits as Record<string, any> | null,
      billingEmail: site.billingEmail,
    };
  }

  /**
   * Update subscription for a site
   */
  async updateSiteSubscription(
    siteId: string,
    data: Partial<Omit<SiteSubscriptionDto, "siteId">>
  ): Promise<SiteSubscriptionDto> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const updated = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        plan: data.plan,
        planStatus: data.planStatus ?? undefined,
        planValidUntil: data.planValidUntil ?? undefined,
        planLimits: data.planLimits ? (data.planLimits as any) : undefined,
        billingEmail: data.billingEmail ?? undefined,
      },
      select: {
        id: true,
        plan: true,
        planStatus: true,
        planValidUntil: true,
        planLimits: true,
        billingEmail: true,
      },
    });

    return {
      siteId: updated.id,
      plan: updated.plan,
      planStatus: updated.planStatus,
      planValidUntil: updated.planValidUntil,
      planLimits: updated.planLimits as Record<string, any> | null,
      billingEmail: updated.billingEmail,
    };
  }

  /**
   * Get entitlements and usage for a site
   */
  async getSiteEntitlements(siteId: string): Promise<SiteEntitlementsDto> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        places: {
          where: { isActive: true },
          select: {
            id: true,
            isFeatured: true,
          },
        },
        events: {
          select: { id: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const limits = getSiteLimits(site.plan);
    const placeCount = site.places?.length || 0;
    const featuredPlaceCount =
      site.places?.filter((p) => p.isFeatured).length || 0;
    const eventCount = site.events?.length || 0;

    // Determine if upgrade/downgrade is possible
    const canUpgrade = site.plan !== "business";
    const canDowngrade = site.plan !== "free";

    return {
      siteId: site.id,
      plan: site.plan,
      limits,
      currentUsage: {
        places: placeCount,
        featuredPlaces: featuredPlaceCount,
        events: eventCount,
      },
      canUpgrade,
      canDowngrade,
    };
  }
}

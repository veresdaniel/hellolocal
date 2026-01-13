// apps/api/src/billing/billing.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlacePlan, SitePlan, SubscriptionPlan } from "@prisma/client";
import { getPlaceLimits, type PlaceLimits } from "../config/place-limits.config";
import { getSiteLimits, type SiteLimits } from "../config/site-limits.config";

// Helper function to convert PlacePlan to SubscriptionPlan
function placePlanToSubscriptionPlan(plan: PlacePlan): SubscriptionPlan {
  switch (plan) {
    case "free":
      return SubscriptionPlan.FREE;
    case "basic":
      return SubscriptionPlan.BASIC;
    case "pro":
      return SubscriptionPlan.PRO;
    default:
      return SubscriptionPlan.FREE;
  }
}

// Helper function to get the first day of next month
function getFirstDayOfNextMonth(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

// Helper function to add one month to a date
function addOneMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

export interface PlaceSubscriptionDto {
  placeId: string;
  plan: PlacePlan;
  isFeatured: boolean;
  featuredUntil: Date | null;
  // Subscription details from PlaceSubscription model
  validUntil: Date | null;
  priceCents: number | null;
  currency: string | null;
  statusChangedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SiteSubscriptionDto {
  siteId: string;
  plan: SitePlan;
  planStatus: string | null;
  planValidUntil: Date | null;
  planLimits: Record<string, any> | null;
  billingEmail: string | null;
  allowPublicRegistration: boolean;
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
   * Get place plan overrides from Brand
   */
  private async getPlacePlanOverrides(): Promise<any> {
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
      select: { placePlanOverrides: true },
    });
    return (brand?.placePlanOverrides as any) || null;
  }

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
        subscription: {
          select: {
            validUntil: true,
            priceCents: true,
            currency: true,
            statusChangedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
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
      validUntil: place.subscription?.validUntil || null,
      priceCents: place.subscription?.priceCents || null,
      currency: place.subscription?.currency || null,
      statusChangedAt: place.subscription?.statusChangedAt || null,
      createdAt: place.subscription?.createdAt || null,
      updatedAt: place.subscription?.updatedAt || null,
    };
  }

  /**
   * Update subscription for a place
   */
  async updatePlaceSubscription(
    placeId: string,
    data: Partial<Omit<PlaceSubscriptionDto, "placeId">>,
    changedBy?: string
  ): Promise<PlaceSubscriptionDto> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      include: {
        events: {
          select: { id: true },
        },
        galleries: true,
        subscription: true, // Include existing subscription to track old plan
      },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found`);
    }

    // Get old subscription data for history tracking
    const oldSubscription = place.subscription;
    // If no subscription exists, use the place's current plan as the old plan
    const oldPlan = oldSubscription?.plan || (place.plan === "free" ? "FREE" : place.plan === "basic" ? "BASIC" : "PRO");

    // If plan is being changed, validate that current usage doesn't exceed new plan limits
    if (data.plan && data.plan !== place.plan) {
      const overrides = await this.getPlacePlanOverrides();
      const newLimits = getPlaceLimits(data.plan, overrides);
      // Extract all images from galleries and count them
      const galleryImages = (place.galleries || [])
        .flatMap((gallery: any) => {
          try {
            const images = typeof gallery.images === 'string' 
              ? JSON.parse(gallery.images) 
              : gallery.images;
            return Array.isArray(images) ? images : [];
          } catch {
            return [];
          }
        });
      const currentImageCount = galleryImages.length + (place.heroImage ? 1 : 0);
      const currentEventCount = place.events?.length || 0;

      // Validate image limit
      if (newLimits.images !== Infinity && currentImageCount > newLimits.images) {
        throw new BadRequestException(
          `Cannot downgrade to "${data.plan}" plan. Current image count (${currentImageCount}) exceeds the plan limit (${newLimits.images}). Please remove ${currentImageCount - newLimits.images} image(s) first.`
        );
      }

      // Validate event limit
      if (newLimits.events !== Infinity && currentEventCount > newLimits.events) {
        throw new BadRequestException(
          `Cannot downgrade to "${data.plan}" plan. Current event count (${currentEventCount}) exceeds the plan limit (${newLimits.events}). Please remove ${currentEventCount - newLimits.events} event(s) first.`
        );
      }

      // Validate featured status
      if (place.isFeatured && !newLimits.featured) {
        throw new BadRequestException(
          `Cannot downgrade to "${data.plan}" plan. This place is currently featured, but the "${data.plan}" plan does not support featured status. Please disable featured status first.`
        );
      }
    }

    // Validate featured status based on plan
    if (data.isFeatured && data.plan) {
      const overrides = await this.getPlacePlanOverrides();
      const limits = getPlaceLimits(data.plan, overrides);
      if (!limits.featured) {
        throw new BadRequestException(
          `Plan ${data.plan} does not support featured status`
        );
      }
    }

    // Update place plan and featured status
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

    // Update or create PlaceSubscription record
    const subscriptionData: any = {};
    if (data.priceCents !== undefined) subscriptionData.priceCents = data.priceCents;
    if (data.currency !== undefined) subscriptionData.currency = data.currency;
    
    // If plan changed, update statusChangedAt and plan in subscription
    const newPlan = data.plan || place.plan;
    const planChanged = data.plan && data.plan !== place.plan;
    const isNewSubscription = !oldSubscription;
    const newSubscriptionPlan = placePlanToSubscriptionPlan(newPlan);
    
    if (planChanged) {
      subscriptionData.statusChangedAt = new Date();
      subscriptionData.plan = newSubscriptionPlan;
      
      // If plan changed and validUntil is not explicitly set, set to first day of next month
      if (data.validUntil === undefined) {
        subscriptionData.validUntil = getFirstDayOfNextMonth();
      } else if (data.validUntil !== null) {
        subscriptionData.validUntil = data.validUntil;
      }
    } else if (!data.plan) {
      // If plan is not being updated, ensure subscription plan matches place plan
      subscriptionData.plan = newSubscriptionPlan;
      // Keep existing validUntil if not explicitly changed
      if (data.validUntil !== undefined) {
        subscriptionData.validUntil = data.validUntil;
      }
    } else {
      // Plan not changed, but validUntil might be updated
      if (data.validUntil !== undefined) {
        subscriptionData.validUntil = data.validUntil;
      }
    }

    // If creating new subscription and validUntil is not set, set to first day of next month
    const createValidUntil = isNewSubscription && !data.validUntil
      ? getFirstDayOfNextMonth()
      : (data.validUntil ?? null);
    
    const subscription = await this.prisma.placeSubscription.upsert({
      where: { placeId },
      create: {
        placeId,
        plan: newSubscriptionPlan,
        validUntil: createValidUntil,
        priceCents: data.priceCents ?? null,
        currency: data.currency ?? null,
        statusChangedAt: subscriptionData.statusChangedAt || new Date(),
      },
      update: subscriptionData,
      select: {
        id: true,
        plan: true,
        validUntil: true,
        priceCents: true,
        currency: true,
        statusChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create history entry if plan changed
    // Only create history if plan actually changed (not on first creation unless plan is different from default)
    if (planChanged) {
      try {
        const oldPlanValue = oldPlan as any;
        const newPlanValue = newSubscriptionPlan;

        await this.prisma.subscriptionHistory.create({
          data: {
            scope: "place",
            subscriptionId: subscription.id,
            changeType: "PLAN_CHANGE",
            oldPlan: oldPlanValue,
            newPlan: newPlanValue,
            oldStatus: oldSubscription?.status || "ACTIVE",
            newStatus: oldSubscription?.status || "ACTIVE",
            oldValidUntil: oldSubscription?.validUntil || null,
            newValidUntil: subscription.validUntil,
            amountCents: subscription.priceCents,
            currency: subscription.currency,
            note: `Plan changed from ${oldPlanValue} to ${newPlanValue}`,
            changedBy: changedBy || null,
          },
        });
      } catch (error) {
        console.error("Error creating subscription history entry:", error);
        // Don't throw - history logging should not break the main operation
      }
    } else if (isNewSubscription && newSubscriptionPlan !== "BASIC") {
      // If subscription is created with a non-BASIC plan, create history entry
      try {
        await this.prisma.subscriptionHistory.create({
          data: {
            scope: "place",
            subscriptionId: subscription.id,
            changeType: "CREATED",
            oldPlan: null,
            newPlan: newSubscriptionPlan,
            oldStatus: null,
            newStatus: "ACTIVE",
            oldValidUntil: null,
            newValidUntil: subscription.validUntil,
            amountCents: subscription.priceCents,
            currency: subscription.currency,
            note: `Subscription created with plan ${newSubscriptionPlan}`,
            changedBy: changedBy || null,
          },
        });
      } catch (error) {
        console.error("Error creating subscription history entry:", error);
        // Don't throw - history logging should not break the main operation
      }
    }

    return {
      placeId: updated.id,
      plan: updated.plan,
      isFeatured: updated.isFeatured,
      featuredUntil: updated.featuredUntil,
      validUntil: subscription.validUntil,
      priceCents: subscription.priceCents,
      currency: subscription.currency,
      statusChangedAt: subscription.statusChangedAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
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
        galleries: true,
      },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found`);
    }

    const overrides = await this.getPlacePlanOverrides();
    const limits = getPlaceLimits(place.plan, overrides);
    // Extract all images from galleries and count them
    const galleryImages = (place.galleries || [])
      .flatMap((gallery: any) => {
        try {
          const images = typeof gallery.images === 'string' 
            ? JSON.parse(gallery.images) 
            : gallery.images;
          return Array.isArray(images) ? images : [];
        } catch {
          return [];
        }
      });
    const imageCount = galleryImages.length + (place.heroImage ? 1 : 0);
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
        allowPublicRegistration: true,
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
      allowPublicRegistration: site.allowPublicRegistration ?? true,
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
        allowPublicRegistration: data.allowPublicRegistration ?? undefined,
      },
      select: {
        id: true,
        plan: true,
        planStatus: true,
        planValidUntil: true,
        planLimits: true,
        billingEmail: true,
        allowPublicRegistration: true,
      },
    });

    return {
      siteId: updated.id,
      plan: updated.plan,
      planStatus: updated.planStatus,
      planValidUntil: updated.planValidUntil,
      planLimits: updated.planLimits as Record<string, any> | null,
      billingEmail: updated.billingEmail,
      allowPublicRegistration: updated.allowPublicRegistration ?? true,
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
    const canDowngrade = site.plan !== "basic";

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

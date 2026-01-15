// admin-feature-subscription.service.ts
import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FeatureSubscriptionScope, FeatureSubscriptionStatus, FeatureKey, BillingPeriod } from "@prisma/client";

export interface CreateFeatureSubscriptionDto {
  siteId: string;
  scope: FeatureSubscriptionScope;
  placeId?: string; // Required if scope='place'
  featureKey: FeatureKey;
  planKey: string; // 'FP_1' | 'FP_5' | 'FP_CUSTOM'
  billingPeriod: BillingPeriod;
  floorplanLimit?: number; // For FP_CUSTOM
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

export interface UpdateFeatureSubscriptionDto {
  planKey?: string;
  billingPeriod?: BillingPeriod;
  floorplanLimit?: number;
  status?: FeatureSubscriptionStatus;
  scope?: FeatureSubscriptionScope; // Allow scope changes
  placeId?: string | null; // Required if scope='place', null if scope='site'
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

export interface FloorplanEntitlement {
  entitled: boolean;
  activeScope: FeatureSubscriptionScope | null;
  limit: number;
  used: number;
  status: "locked" | "active" | "limit_reached";
  subscriptionId?: string;
  currentPeriodEnd?: Date;
}

@Injectable()
export class AdminFeatureSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get floorplan entitlement for a place
   */
  async getFloorplanEntitlement(placeId: string, siteId: string): Promise<FloorplanEntitlement> {
    const now = new Date();
    
    // Get active or cancelled subscriptions that haven't expired yet (place scope takes precedence over site scope)
    // Cancelled subscriptions remain active until currentPeriodEnd
    const placeSub = await this.prisma.featureSubscription.findFirst({
      where: {
        placeId,
        featureKey: FeatureKey.FLOORPLANS,
        status: {
          in: [FeatureSubscriptionStatus.active, FeatureSubscriptionStatus.canceled],
        },
        currentPeriodEnd: {
          gte: now,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const siteSub = placeSub
      ? null
      : await this.prisma.featureSubscription.findFirst({
          where: {
            siteId,
            scope: FeatureSubscriptionScope.site,
            placeId: null,
            featureKey: FeatureKey.FLOORPLANS,
            status: {
              in: [FeatureSubscriptionStatus.active, FeatureSubscriptionStatus.canceled],
            },
            currentPeriodEnd: {
              gte: now,
            },
          },
          orderBy: { createdAt: "desc" },
        });

    const activeSub = placeSub || siteSub;

    if (!activeSub) {
      // Count existing floorplans
      const used = await this.prisma.placeFloorplan.count({
        where: { placeId },
      });

      return {
        entitled: false,
        activeScope: null,
        limit: 0,
        used,
        status: "locked",
      };
    }

    // All plans allow only 1 floorplan per place
    const limit = 1;

    // Count existing floorplans
    const used = await this.prisma.placeFloorplan.count({
      where: { placeId },
    });

    const status = used >= limit ? "limit_reached" : "active";

    return {
      entitled: true,
      activeScope: activeSub.scope,
      limit,
      used,
      status,
      subscriptionId: activeSub.id,
      currentPeriodEnd: activeSub.currentPeriodEnd || undefined,
    };
  }

  /**
   * Create a new feature subscription
   */
  async create(dto: CreateFeatureSubscriptionDto) {
    // Validate scope and placeId
    if (dto.scope === FeatureSubscriptionScope.place && !dto.placeId) {
      throw new BadRequestException("placeId is required when scope is 'place'");
    }

    if (dto.scope === FeatureSubscriptionScope.site && dto.placeId) {
      throw new BadRequestException("placeId must be null when scope is 'site'");
    }

    // Validate planKey and floorplanLimit
    if (dto.planKey === "FP_CUSTOM" && !dto.floorplanLimit) {
      throw new BadRequestException("floorplanLimit is required for FP_CUSTOM plan");
    }

    // Check for existing active subscription with same feature, scope, planKey
    const existingActiveSub = await this.prisma.featureSubscription.findFirst({
      where: {
        siteId: dto.siteId,
        featureKey: dto.featureKey,
        planKey: dto.planKey,
        scope: dto.scope,
        placeId: dto.scope === FeatureSubscriptionScope.place ? dto.placeId : null,
        status: FeatureSubscriptionStatus.active,
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
    });

    if (existingActiveSub) {
      throw new BadRequestException("Erre a funkcióra már van aktív előfizetés ebben a csomagban.");
    }

    // Calculate currentPeriodEnd (default: 1 month from now for monthly, 1 year for yearly)
    const currentPeriodEnd = dto.currentPeriodEnd || this.calculatePeriodEnd(dto.billingPeriod);

    return this.prisma.featureSubscription.create({
      data: {
        siteId: dto.siteId,
        scope: dto.scope,
        placeId: dto.placeId || null,
        featureKey: dto.featureKey,
        planKey: dto.planKey,
        billingPeriod: dto.billingPeriod,
        floorplanLimit: dto.floorplanLimit || null,
        status: FeatureSubscriptionStatus.active,
        stripeSubscriptionId: dto.stripeSubscriptionId || null,
        currentPeriodEnd,
      },
    });
  }

  /**
   * Update a feature subscription
   */
  async update(id: string, dto: UpdateFeatureSubscriptionDto) {
    const existing = await this.prisma.featureSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature subscription with id ${id} not found`);
    }

    // Validate scope changes
    if (dto.scope !== undefined) {
      if (dto.scope === FeatureSubscriptionScope.place && !dto.placeId) {
        throw new BadRequestException("placeId is required when scope is 'place'");
      }
      if (dto.scope === FeatureSubscriptionScope.site && dto.placeId !== null && dto.placeId !== undefined) {
        throw new BadRequestException("placeId must be null when scope is 'site'");
      }
    }

    // Validate floorplanLimit for FP_CUSTOM
    if (dto.planKey === "FP_CUSTOM" && dto.floorplanLimit === undefined && !existing.floorplanLimit) {
      throw new BadRequestException("floorplanLimit is required for FP_CUSTOM plan");
    }

    return this.prisma.featureSubscription.update({
      where: { id },
      data: {
        ...(dto.planKey && { planKey: dto.planKey }),
        ...(dto.billingPeriod && { billingPeriod: dto.billingPeriod }),
        ...(dto.floorplanLimit !== undefined && { floorplanLimit: dto.floorplanLimit }),
        ...(dto.status && { status: dto.status }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.scope !== undefined && dto.placeId !== undefined && { placeId: dto.placeId }),
        ...(dto.stripeSubscriptionId !== undefined && { stripeSubscriptionId: dto.stripeSubscriptionId }),
        ...(dto.currentPeriodEnd && { currentPeriodEnd: dto.currentPeriodEnd }),
      },
    });
  }

  /**
   * Cancel a feature subscription
   * The subscription remains active until currentPeriodEnd, then it expires
   */
  async cancel(id: string) {
    const existing = await this.prisma.featureSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature subscription with id ${id} not found`);
    }

    if (existing.status === FeatureSubscriptionStatus.canceled) {
      throw new BadRequestException("Subscription is already cancelled");
    }

    // Keep the subscription active until currentPeriodEnd
    // The status will remain active, but we mark it as canceled
    // The entitlement check will handle expiration based on currentPeriodEnd
    return this.prisma.featureSubscription.update({
      where: { id },
      data: {
        status: FeatureSubscriptionStatus.canceled,
        // Keep currentPeriodEnd as is - the subscription will remain active until then
      },
    });
  }

  /**
   * Suspend a feature subscription
   * Note: Suspended status is not available in the enum, so we use canceled instead
   */
  async suspend(id: string) {
    const existing = await this.prisma.featureSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature subscription with id ${id} not found`);
    }

    if (existing.status === FeatureSubscriptionStatus.canceled) {
      throw new BadRequestException("Subscription is already suspended/cancelled");
    }

    // Use canceled status as suspended is not available
    return this.prisma.featureSubscription.update({
      where: { id },
      data: {
        status: FeatureSubscriptionStatus.canceled,
      },
    });
  }

  /**
   * Resume a feature subscription
   */
  async resume(id: string) {
    const existing = await this.prisma.featureSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature subscription with id ${id} not found`);
    }

    if (existing.status !== FeatureSubscriptionStatus.canceled) {
      throw new BadRequestException("Only cancelled subscriptions can be resumed");
    }

    return this.prisma.featureSubscription.update({
      where: { id },
      data: {
        status: FeatureSubscriptionStatus.active,
      },
    });
  }

  /**
   * Get all subscriptions for a site
   */
  async getBySite(siteId: string) {
    return this.prisma.featureSubscription.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all subscriptions for a place
   */
  async getByPlace(placeId: string) {
    return this.prisma.featureSubscription.findMany({
      where: { placeId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all feature subscriptions with filters (for admin dashboard)
   */
  async getAll(params?: {
    scope?: FeatureSubscriptionScope | "all";
    status?: FeatureSubscriptionStatus | "all";
    featureKey?: FeatureKey | "all";
    siteId?: string;
    placeId?: string;
    q?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};

    if (params?.scope && params.scope !== "all") {
      where.scope = params.scope;
    }

    if (params?.status && params.status !== "all") {
      where.status = params.status;
    }

    if (params?.featureKey && params.featureKey !== "all") {
      where.featureKey = params.featureKey;
    }

    if (params?.siteId) {
      where.siteId = params.siteId;
    }

    if (params?.placeId) {
      where.placeId = params.placeId;
    }

    if (params?.q) {
      where.OR = [
        { planKey: { contains: params.q, mode: "insensitive" } },
        { stripeSubscriptionId: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.featureSubscription.findMany({
        where,
        take: params?.take || 10,
        skip: params?.skip || 0,
        orderBy: { createdAt: "desc" },
        include: {
          site: {
            select: {
              id: true,
              slug: true,
              translations: {
                select: {
                  lang: true,
                  name: true,
                },
              },
            },
          },
          place: {
            select: {
              id: true,
              translations: {
                select: {
                  lang: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.featureSubscription.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Delete a feature subscription
   */
  async delete(id: string) {
    const existing = await this.prisma.featureSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature subscription with id ${id} not found`);
    }

    return this.prisma.featureSubscription.delete({
      where: { id },
    });
  }

  /**
   * Calculate period end date based on billing period
   */
  private calculatePeriodEnd(billingPeriod: BillingPeriod): Date {
    const now = new Date();
    if (billingPeriod === BillingPeriod.YEARLY) {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now;
  }
}

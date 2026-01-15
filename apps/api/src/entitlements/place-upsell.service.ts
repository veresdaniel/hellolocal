// place-upsell.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "./entitlements.service";
import { Entitlements } from "./entitlements.config";
import { getPlaceLimits, type PlacePlan } from "../config/place-limits.config";
import type { AdminFeatureSubscriptionService } from "../admin/admin-feature-subscription.service";

export type FeatureGate =
  | { state: "enabled" }
  | { state: "locked"; reason: string; upgradeCta: "viewPlans" | "contactAdmin" }
  | { state: "limit_reached"; reason: string; upgradeCta: "upgradePlan"; alternativeCta?: "manageExisting" };

export type PlaceUpsellState = {
  featured: FeatureGate;
  gallery: FeatureGate;
  floorplans: FeatureGate;
};

@Injectable()
export class PlaceUpsellService implements OnModuleInit {
  private featureSubscriptionService: AdminFeatureSubscriptionService | null = null;

  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef
  ) {}

  async onModuleInit() {
    // Lazy load AdminFeatureSubscriptionService to avoid circular dependency
    try {
      this.featureSubscriptionService = await this.moduleRef.get("AdminFeatureSubscriptionService", { strict: false });
    } catch (error) {
      // Service not available, that's okay - floorplan feature will be disabled
      console.debug("AdminFeatureSubscriptionService not available, floorplan feature disabled");
    }
  }

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
   * Get feature gate for featured place functionality
   */
  getFeaturedGate(ent: Entitlements, placeIsFeatured: boolean): FeatureGate {
    if (ent.status !== "ACTIVE") {
      return {
        state: "locked",
        reason: "Az előfizetés nem aktív.",
        upgradeCta: "contactAdmin",
      };
    }

    if (ent.limits.featuredPlacesMax === 0) {
      return {
        state: "locked",
        reason: "Kiemelt megjelenés nem érhető el ebben a csomagban.",
        upgradeCta: "viewPlans",
      };
    }

    const reached = ent.usage.featuredPlacesCount >= ent.limits.featuredPlacesMax;
    if (reached && !placeIsFeatured) {
      return {
        state: "limit_reached",
        reason: `Elérted a kiemelések számát (${ent.usage.featuredPlacesCount}/${ent.limits.featuredPlacesMax}).`,
        upgradeCta: "upgradePlan",
        alternativeCta: "manageExisting",
      };
    }

    return { state: "enabled" };
  }

  /**
   * Get feature gate for gallery images (beyond plan limit)
   */
  async getGalleryGate(
    placePlan: PlacePlan,
    currentImageCount: number,
    galleryLimitOverride: number | null
  ): Promise<FeatureGate> {
    const overrides = await this.getPlacePlanOverrides();
    const placeLimits = getPlaceLimits(placePlan, overrides);
    const baseLimit = placeLimits.images;
    
    // If limit is Infinity, always enabled
    if (baseLimit === Infinity) {
      return { state: "enabled" };
    }

    const effectiveLimit = baseLimit + (galleryLimitOverride || 0);

    // If already at or over limit, check if override is available
    if (currentImageCount >= effectiveLimit) {
      // Check if override is already applied
      if (galleryLimitOverride !== null && galleryLimitOverride > 0) {
        return {
          state: "limit_reached",
          reason: `Elérted a kép limitet (${currentImageCount}/${effectiveLimit}).`,
          upgradeCta: "upgradePlan",
        };
      }

      // Override not yet applied, suggest it
      return {
        state: "limit_reached",
        reason: `Elérted a kép limitet (${currentImageCount}/${baseLimit}).`,
        upgradeCta: "upgradePlan",
      };
    }

    return { state: "enabled" };
  }

  /**
   * Get feature gate for floorplans
   */
  async getFloorplanGate(siteId: string, placeId: string, placePlan?: PlacePlan): Promise<FeatureGate> {
    // Free accounts cannot use floorplan feature at all
    if (placePlan === "free") {
      return {
        state: "locked",
        reason: "Alaprajzok nem érhető el ebben a csomagban.",
        upgradeCta: "viewPlans",
      };
    }

    // Lazy load service if not yet loaded
    if (!this.featureSubscriptionService) {
      try {
        this.featureSubscriptionService = await this.moduleRef.get("AdminFeatureSubscriptionService", { strict: false });
      } catch {
        // Service not available
      }
    }

    if (!this.featureSubscriptionService) {
      return {
        state: "locked",
        reason: "Alaprajzok nem érhető el ebben a csomagban.",
        upgradeCta: "contactAdmin",
      };
    }

    try {
      const entitlement = await this.featureSubscriptionService.getFloorplanEntitlement(placeId, siteId);

      if (!entitlement.entitled) {
        // This will be handled by frontend - it will show positive message when onClick is available
        return {
          state: "locked",
          reason: "", // Frontend will generate the message based on label
          upgradeCta: "viewPlans",
        };
      }

      if (entitlement.status === "limit_reached") {
        return {
          state: "limit_reached",
          reason: `Elérted az alaprajz limitet (${entitlement.used}/${entitlement.limit}).`,
          upgradeCta: "upgradePlan",
        };
      }

      return { state: "enabled" };
    } catch (error) {
      console.warn("Failed to check floorplan entitlement:", error);
      return {
        state: "locked",
        reason: "Alaprajzok nem érhető el ebben a csomagban.",
        upgradeCta: "contactAdmin",
      };
    }
  }

  /**
   * Get complete upsell state for a place
   */
  async getPlaceUpsellState(
    siteId: string,
    placeId: string,
    placePlan: PlacePlan,
    placeIsFeatured: boolean,
    currentImageCount: number,
    galleryLimitOverride: number | null
  ): Promise<PlaceUpsellState> {
    const ent = await this.entitlementsService.getBySiteId(siteId);

    return {
      featured: this.getFeaturedGate(ent, placeIsFeatured),
      gallery: await this.getGalleryGate(placePlan, currentImageCount, galleryLimitOverride),
      floorplans: await this.getFloorplanGate(siteId, placeId, placePlan),
    };
  }
}

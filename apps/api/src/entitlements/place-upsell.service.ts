// place-upsell.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "./entitlements.service";
import { Entitlements } from "./entitlements.config";
import { getPlaceLimits, type PlacePlan } from "../config/place-limits.config";

export type FeatureGate =
  | { state: "enabled" }
  | { state: "locked"; reason: string; upgradeCta: "viewPlans" | "contactAdmin" }
  | { state: "limit_reached"; reason: string; upgradeCta: "upgradePlan"; alternativeCta?: "manageExisting" };

export type PlaceUpsellState = {
  featured: FeatureGate;
  gallery: FeatureGate;
};

@Injectable()
export class PlaceUpsellService {
  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService
  ) {}

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
        reason: "A kiemelés nem érhető el ebben a csomagban.",
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
    };
  }
}

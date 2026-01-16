// apps/api/src/config/place-limits.config.ts

export type PlacePlan = "free" | "basic" | "pro";

export type PlaceLimits = {
  images: number; // Infinity means unlimited
  events: number; // Infinity means unlimited
  featured: boolean; // Whether featured placement is available
};

export const PLACE_LIMITS: Record<PlacePlan, PlaceLimits> = {
  free: {
    images: 3,
    events: 0,
    featured: false,
  },
  basic: {
    images: 15,
    events: 3,
    featured: false,
  },
  pro: {
    images: 30,
    events: Infinity,
    featured: true,
  },
};

/**
 * Deep merge place limits with override
 */
function deepMergePlaceLimits(base: PlaceLimits, override: any): PlaceLimits {
  const result = { ...base };

  if (override.images !== undefined) {
    result.images =
      override.images === "∞" || override.images === Infinity ? Infinity : override.images;
  }
  if (override.events !== undefined) {
    result.events =
      override.events === "∞" || override.events === Infinity ? Infinity : override.events;
  }
  if (override.featured !== undefined) {
    result.featured = override.featured;
  }

  return result;
}

/**
 * Get limits for a place plan with optional overrides
 * @param plan - The place plan
 * @param overrides - Optional overrides from Brand.placePlanOverrides
 */
export function getPlaceLimits(plan: PlacePlan, overrides?: any): PlaceLimits {
  const base = PLACE_LIMITS[plan];

  if (!overrides) {
    return base;
  }

  const planOverride = overrides[plan];
  if (!planOverride) {
    return base;
  }

  return deepMergePlaceLimits(base, planOverride);
}

/**
 * Check if a place can have featured status
 */
export function canBeFeatured(plan: PlacePlan): boolean {
  return PLACE_LIMITS[plan].featured;
}

/**
 * Check if a place can add more images
 */
export function canAddImage(plan: PlacePlan, currentImageCount: number): boolean {
  const limit = PLACE_LIMITS[plan].images;
  return limit === Infinity || currentImageCount < limit;
}

/**
 * Check if a place can add more events
 */
export function canAddEvent(plan: PlacePlan, currentEventCount: number): boolean {
  const limit = PLACE_LIMITS[plan].events;
  return limit === Infinity || currentEventCount < limit;
}

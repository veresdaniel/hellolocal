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
    images: Infinity,
    events: Infinity,
    featured: true,
  },
};

/**
 * Get limits for a place plan
 */
export function getPlaceLimits(plan: PlacePlan): PlaceLimits {
  return PLACE_LIMITS[plan];
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

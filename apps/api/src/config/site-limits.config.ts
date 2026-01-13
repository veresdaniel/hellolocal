// apps/api/src/config/site-limits.config.ts

import { SitePlan } from "@prisma/client";

export type SitePlanType = SitePlan;

export type SiteLimits = {
  places: number; // Infinity means unlimited
  featuredSlots: number; // Number of featured place slots available
  events: number; // Infinity means unlimited, or monthly limit
  imagesPerPlace: number; // Infinity means unlimited
  customDomain: boolean; // Whether custom domain is available
  multiAdmin: boolean; // Whether multiple admins are supported
  analytics: "none" | "basic" | "advanced"; // Analytics level
  support: "community" | "email" | "sla"; // Support level
};

export const SITE_LIMITS: Record<SitePlanType, SiteLimits> = {
  free: {
    places: 3, // or unlimited with fewer features
    featuredSlots: 0,
    events: 0, // or 1
    imagesPerPlace: 3,
    customDomain: false,
    multiAdmin: false,
    analytics: "none",
    support: "community",
  },
  official: {
    // Legacy plan, treat as pro
    places: Infinity,
    featuredSlots: 1,
    events: 20, // per month
    imagesPerPlace: 30,
    customDomain: false,
    multiAdmin: false,
    analytics: "basic",
    support: "email",
  },
  pro: {
    places: Infinity, // or 10-50
    featuredSlots: 3,
    events: Infinity, // or 20/month
    imagesPerPlace: Infinity, // or 10-30
    customDomain: false, // or true if business feature
    multiAdmin: false,
    analytics: "basic",
    support: "email",
  },
  business: {
    places: Infinity,
    featuredSlots: Infinity, // or higher number with priority
    events: Infinity,
    imagesPerPlace: Infinity,
    customDomain: true,
    multiAdmin: true,
    analytics: "advanced",
    support: "sla",
  },
};

/**
 * Get limits for a site plan
 */
export function getSiteLimits(plan: SitePlanType): SiteLimits {
  return SITE_LIMITS[plan];
}

/**
 * Check if a site can have featured places
 */
export function canHaveFeaturedPlaces(plan: SitePlanType): boolean {
  return SITE_LIMITS[plan].featuredSlots > 0;
}

/**
 * Check if a site can add more places
 */
export function canAddPlace(plan: SitePlanType, currentPlaceCount: number): boolean {
  const limit = SITE_LIMITS[plan].places;
  return limit === Infinity || currentPlaceCount < limit;
}

/**
 * Check if a site can add more featured places
 */
export function canAddFeaturedPlace(
  plan: SitePlanType,
  currentFeaturedCount: number
): boolean {
  const limit = SITE_LIMITS[plan].featuredSlots;
  return limit === Infinity || currentFeaturedCount < limit;
}

/**
 * Check if a site can add more events
 */
export function canAddEvent(plan: SitePlanType, currentEventCount: number): boolean {
  const limit = SITE_LIMITS[plan].events;
  return limit === Infinity || currentEventCount < limit;
}

/**
 * Check if a site can use custom domain
 */
export function canUseCustomDomain(plan: SitePlanType): boolean {
  return SITE_LIMITS[plan].customDomain;
}

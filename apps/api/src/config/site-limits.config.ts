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
  basic: {
    places: Infinity, // Korlátlan place (default) - mind a tulaj, mind az oda regisztráló felhasználó létrehozhat
    featuredSlots: 0, // Nincs kiemelt helyek
    events: 0, // Nincs események
    imagesPerPlace: Infinity, // Korlátlan kép
    customDomain: false, // Nincs egyedi domain
    multiAdmin: false,
    analytics: "none", // Nincs SEO
    support: "community",
  },
  pro: {
    places: Infinity,
    featuredSlots: 3,
    events: Infinity,
    imagesPerPlace: Infinity,
    customDomain: false,
    multiAdmin: false,
    analytics: "basic",
    support: "email",
  },
  business: {
    places: Infinity,
    featuredSlots: Infinity,
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

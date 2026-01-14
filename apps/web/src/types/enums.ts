/**
 * Centralized enums and types for the application
 * These should match the Prisma schema enums
 */

// Language enum - matches Prisma Lang enum
export const LANG_VALUES = ["hu", "en", "de"] as const;
export type Lang = (typeof LANG_VALUES)[number];

// User roles - matches Prisma UserRole enum
export const USER_ROLES = ["superadmin", "admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Site roles - matches Prisma SiteRole enum
export const SITE_ROLES = ["siteadmin", "editor", "viewer"] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

// Site role constants
export const SITE_ROLE_VIEWER: SiteRole = "viewer";
export const SITE_ROLE_EDITOR: SiteRole = "editor";
export const SITE_ROLE_SITEADMIN: SiteRole = "siteadmin";

// Place roles - matches Prisma PlaceRole enum
export const PLACE_ROLES = ["owner", "manager", "editor"] as const;
export type PlaceRole = (typeof PLACE_ROLES)[number];

// Place plans - matches Prisma PlacePlan enum
export const PLACE_PLANS = ["free", "basic", "pro"] as const;
export type PlacePlan = (typeof PLACE_PLANS)[number];

// Site/Subscription plans - matches Prisma SubscriptionPlan enum
export const SUBSCRIPTION_PLANS = ["FREE", "BASIC", "PRO", "BUSINESS"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

// Subscription status - matches Prisma SubscriptionStatus enum
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELLED", "SUSPENDED", "EXPIRED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// Billing period - matches Prisma BillingPeriod enum
export const BILLING_PERIODS = ["MONTHLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

// Role hierarchy for permission checking
export const USER_ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

export const SITE_ROLE_HIERARCHY: Record<SiteRole, number> = {
  viewer: 1,
  editor: 2,
  siteadmin: 3,
};

// Role constants for easier access
export const ROLE_VIEWER: UserRole = "viewer";
export const ROLE_EDITOR: UserRole = "editor";
export const ROLE_ADMIN: UserRole = "admin";
export const ROLE_SUPERADMIN: UserRole = "superadmin";

// Helper functions
export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function isSiteRole(value: string): value is SiteRole {
  return SITE_ROLES.includes(value as SiteRole);
}

export function isPlacePlan(value: string): value is PlacePlan {
  return PLACE_PLANS.includes(value as PlacePlan);
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan);
}

export function isLang(value: string): value is Lang {
  return LANG_VALUES.includes(value as Lang);
}

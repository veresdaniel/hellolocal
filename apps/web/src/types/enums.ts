/**
 * Centralized enums and types for the application.
 * UI langs / roles come from `@hellolocal/shared`; Prisma-aligned plans stay local.
 */
import { isUiLang as sharedIsUiLang, type UiLang } from "@hellolocal/shared";

export {
  LANG_VALUES,
  FALLBACK_LANG,
  isLanguageCode,
  USER_ROLES,
  SITE_ROLES,
  PLACE_ROLES,
  USER_ROLE_HIERARCHY,
  SITE_ROLE_HIERARCHY,
  ROLE_VIEWER,
  ROLE_EDITOR,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
  SITE_ROLE_VIEWER,
  SITE_ROLE_EDITOR,
  SITE_ROLE_SITEADMIN,
  isUserRole,
  isSiteRole,
  type UiLang,
  type UserRoleId as UserRole,
  type SiteRoleId as SiteRole,
  type PlaceRoleId as PlaceRole,
} from "@hellolocal/shared";

/** A published language. Any ISO 639-1 or 639-2 code, not only hu/en/de. */
export type Lang = string;

const LANGUAGE_CODE = /^[a-z]{2,3}$/;
const RESERVED_LANGUAGE_CODES = new Set(["api", "assets", "static", "src", "www", "app", "css", "img"]);

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

export function isPlacePlan(value: string): value is PlacePlan {
  return PLACE_PLANS.includes(value as PlacePlan);
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan);
}

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && LANGUAGE_CODE.test(value) && !RESERVED_LANGUAGE_CODES.has(value);
}

export function isUiLang(value: unknown): value is UiLang {
  return sharedIsUiLang(typeof value === "string" ? value : undefined);
}

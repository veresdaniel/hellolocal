/**
 * Public platform settings DTO (mirrors API `/public/:lang/:siteKey/platform`).
 * Includes SEO defaults and crawl flags used by CSR pages and SSR overview.
 */
import type { Lang } from "./enums";
export type { Lang };

export type PlatformSettingsDto = {
  lang: Lang;
  languages?: string[];
  siteKey: string;

  site: {
    id: string;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
  };

  brand: {
    name: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    theme?: any;
  };

  /** Per-site theme colors override. Null = use brand / defaults. */
  siteTheme?: any | null;

  seo: {
    defaultTitle?: string | null;
    defaultDescription?: string | null;
    /** Site-level share image override (from SiteTranslation.seoImage). */
    defaultImage?: string | null;
    indexable: boolean;
    /** Master switch. Off forces every public page out of the index. */
    globalIndexable?: boolean;
    /** Platform marketing landing (hellolocal.hu overview). */
    landingIndexable?: boolean;
  };

  placeholders: {
    placeCard?: string | null;
    placeHero?: string | null;
    eventCard?: string | null;
    avatar?: string | null;
  };

  map: {
    provider: "osm";
    style?: string | null;
    center?: { lat: number; lng: number } | null;
    zoom?: number | null;
    bounds?: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null;
    cluster?: boolean | null;
    marker?: any;
  };

  features: {
    events: boolean;
    blog: boolean;
    knowledgeBase: boolean;
    cookieConsent: boolean;
  };

  // Feature matrix overrides (for pricing page)
  featureMatrix?: {
    planOverrides?: any;
    placePlanOverrides?: any;
  };

  // Public map hidden by the visitor ladder. Places are not deleted.
  visitorHold?: boolean;

  // SEO image (for backward compatibility)
  seoImage?: string | null;
  siteName?: string | null;
  seoTitle?: string | null;

  // Platform settings (global)
  platform?: {
    locale: string; // e.g., "hu-HU"
    currency: string; // e.g., "HUF" — fallback for places/products
    timeFormat: "24h" | "12h";
    weekStartsOn: number; // 0 = Sunday, 1 = Monday
    /** Optional platform-wide OG/share image fallback. */
    defaultShareImage?: string | null;
    /** Free-plan trial days before auto-suspend. */
    freeTrialDays?: number;
    currencies?: Array<{
      code: string;
      name: string;
      plural: string;
      symbol: string | null;
    }>;
    currencyByLang?: Record<string, string>;
  };

  /** Flattened alias of `platform.defaultShareImage` for CSR cascades. */
  defaultShareImage?: string | null;

  /** Per-site GA4 ID for this site's public pages. */
  analytics?: {
    gaMeasurementId?: string | null;
  };
};

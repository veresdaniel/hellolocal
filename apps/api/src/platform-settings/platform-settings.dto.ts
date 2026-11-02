import { Lang } from "../common/language-code";

export type PlatformSettingsDto = {
  lang: Lang;
  languages: string[];
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
    theme?: any; // Json
  };

  /** Per-site theme colors override (JSON). Null = use brand / defaults. */
  siteTheme?: any | null;

  seo: {
    defaultTitle?: string | null;
    defaultDescription?: string | null;
    indexable: boolean; // region home: global && site switch
    globalIndexable: boolean; // master switch; off forces every page off
  };

  placeholders: {
    placeCard?: string | null;
    placeHero?: string | null;
    eventCard?: string | null;
    avatar?: string | null;
  };

  map: {
    // összeolvasztott map config (brand defaults + instance override)
    provider: "osm";
    style?: string | null;
    center?: { lat: number; lng: number } | null;
    zoom?: number | null;
    bounds?: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null;
    cluster?: boolean | null;
    marker?: any; // Json
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

  // Platform settings (global)
  platform: {
    locale: string; // e.g., "hu-HU"
    currency: string; // e.g., "HUF"
    timeFormat: "24h" | "12h";
    weekStartsOn: number; // 0 = Sunday, 1 = Monday
  };

  /**
   * Per-site GA4 ID for this site's public pages only.
   * Platform-wide ID is served from GET /api/app-settings/platform-ga (no fallback here).
   */
  analytics?: {
    gaMeasurementId?: string | null;
  };
};

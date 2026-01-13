export type PlatformSettingsDto = {
  lang: "hu" | "en" | "de";
  siteKey: string;

  site: {
    id: string;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
  };

  brand: {
    name: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    theme?: any; // Json
  };

  seo: {
    defaultTitle?: string | null;
    defaultDescription?: string | null;
    indexable: boolean; // robots/index meta alapján
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

  // Platform settings (global)
  platform: {
    locale: string; // e.g., "hu-HU"
    currency: string; // e.g., "HUF"
    timeFormat: "24h" | "12h";
    weekStartsOn: number; // 0 = Sunday, 1 = Monday
  };
};

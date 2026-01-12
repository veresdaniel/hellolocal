import type { Lang } from "../config";

export type PlatformSettings = {
  lang: Lang;
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
    theme?: any;
  };

  seo: {
    defaultTitle?: string | null;
    defaultDescription?: string | null;
    indexable: boolean;
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
};

export type SiteOutletContext = {
  lang: Lang;
  siteKey: string;
  platform: PlatformSettings;
  // Backward compatibility
  tenantKey?: string;
};

// Backward compatibility
export type TenantOutletContext = SiteOutletContext;

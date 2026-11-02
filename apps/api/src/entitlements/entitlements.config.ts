// entitlements.config.ts
export type Entitlements = {
  plan: "FREE" | "BASIC" | "PRO" | "BUSINESS" | "MUNICIPAL";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validUntil?: string | null;

  limits: {
    placesMax: number;
    featuredPlacesMax: number;
    galleryImagesPerPlaceMax: number;
    eventsPerMonthMax: number;
    siteMembersMax: number;
    domainAliasesMax: number;
    languagesMax: number;
    galleriesMax: number; // Maximum number of galleries per site
    imagesPerGalleryMax: number; // Maximum images per gallery
    galleriesPerPlaceMax: number; // Maximum galleries per place
    galleriesPerEventMax: number; // Maximum galleries per event
  };

  features: {
    eventsEnabled: boolean;
    placeSeoEnabled: boolean;
    extrasEnabled: boolean;
    customDomainEnabled: boolean;
    eventLogEnabled: boolean;
  };

  usage: {
    placesCount: number;
    featuredPlacesCount: number;
    eventsThisMonthCount: number;
    siteMembersCount: number;
    domainAliasesCount: number;
    languagesCount: number;
    galleriesCount: number; // Total galleries for this site
  };
};

export const PLAN_DEFS = {
  FREE: {
    limits: {
      placesMax: 1,
      featuredPlacesMax: 0,
      galleryImagesPerPlaceMax: Infinity,
      eventsPerMonthMax: 5,
      siteMembersMax: 1,
      domainAliasesMax: 0,
      languagesMax: 1,
      galleriesMax: Infinity,
      imagesPerGalleryMax: Infinity,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: false,
      extrasEnabled: false,
      customDomainEnabled: false,
      eventLogEnabled: false,
    },
  },
  BASIC: {
    limits: {
      placesMax: 5,
      featuredPlacesMax: 0,
      galleryImagesPerPlaceMax: Infinity,
      eventsPerMonthMax: 15,
      siteMembersMax: Infinity, // Korlátlan tag
      domainAliasesMax: 0, // Nincs egyedi domain
      languagesMax: 1,
      galleriesMax: Infinity,
      imagesPerGalleryMax: Infinity,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: false, // Nincs SEO
      extrasEnabled: false,
      customDomainEnabled: false, // Nincs egyedi domain
      eventLogEnabled: false,
    },
  },
  PRO: {
    limits: {
      placesMax: 30,
      featuredPlacesMax: 15,
      galleryImagesPerPlaceMax: 30,
      eventsPerMonthMax: 30,
      siteMembersMax: 20,
      domainAliasesMax: 5,
      languagesMax: 3,
      galleriesMax: Infinity,
      imagesPerGalleryMax: 100,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: true,
      extrasEnabled: true,
      customDomainEnabled: false,
      eventLogEnabled: true,
    },
  },
  BUSINESS: {
    limits: {
      placesMax: 30,
      featuredPlacesMax: Infinity,
      galleryImagesPerPlaceMax: Infinity,
      eventsPerMonthMax: 30,
      siteMembersMax: Infinity,
      domainAliasesMax: Infinity,
      languagesMax: Infinity,
      galleriesMax: Infinity,
      imagesPerGalleryMax: Infinity,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: true,
      extrasEnabled: true,
      customDomainEnabled: true,
      eventLogEnabled: true,
    },
  },
  MUNICIPAL: {
    limits: {
      placesMax: Infinity,
      featuredPlacesMax: Infinity,
      galleryImagesPerPlaceMax: Infinity,
      eventsPerMonthMax: Infinity,
      siteMembersMax: Infinity,
      domainAliasesMax: Infinity,
      languagesMax: Infinity,
      galleriesMax: Infinity,
      imagesPerGalleryMax: Infinity,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: true,
      extrasEnabled: true,
      customDomainEnabled: true,
      eventLogEnabled: true,
    },
  },
} as const;

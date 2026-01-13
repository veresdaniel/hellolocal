// entitlements.config.ts
export type Entitlements = {
  plan: "BASIC" | "PRO" | "BUSINESS";
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
  BASIC: {
    limits: {
      placesMax: Infinity, // Korlátlan place (default) - mind a tulaj, mind az oda regisztráló felhasználó létrehozhat
      featuredPlacesMax: 0, // Nincs kiemelt helyek
      galleryImagesPerPlaceMax: Infinity, // Korlátlan kép
      eventsPerMonthMax: 0, // Nincs események
      siteMembersMax: Infinity, // Korlátlan tag
      domainAliasesMax: 0, // Nincs egyedi domain
      languagesMax: 1,
      galleriesMax: Infinity,
      imagesPerGalleryMax: Infinity,
      galleriesPerPlaceMax: Infinity,
      galleriesPerEventMax: Infinity,
    },
    features: {
      eventsEnabled: false, // Nincs események
      placeSeoEnabled: false, // Nincs SEO
      extrasEnabled: false,
      customDomainEnabled: false, // Nincs egyedi domain
      eventLogEnabled: false,
    },
  },
  PRO: {
    limits: {
      placesMax: Infinity,
      featuredPlacesMax: 15,
      galleryImagesPerPlaceMax: 30,
      eventsPerMonthMax: 200,
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

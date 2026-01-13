// entitlements.config.ts
export type Entitlements = {
  plan: "FREE" | "BASIC" | "PRO";
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
      placesMax: 3,
      featuredPlacesMax: 0,
      galleryImagesPerPlaceMax: 3,
      eventsPerMonthMax: 0,
      siteMembersMax: 2,
      domainAliasesMax: 0,
      languagesMax: 1,
      galleriesMax: 5,
      imagesPerGalleryMax: 10,
      galleriesPerPlaceMax: 1,
      galleriesPerEventMax: 1,
    },
    features: {
      eventsEnabled: false,
      placeSeoEnabled: false,
      extrasEnabled: false,
      customDomainEnabled: false,
      eventLogEnabled: false,
    },
  },
  BASIC: {
    limits: {
      placesMax: 30,
      featuredPlacesMax: 3,
      galleryImagesPerPlaceMax: 10,
      eventsPerMonthMax: 30,
      siteMembersMax: 5,
      domainAliasesMax: 0,
      languagesMax: 2,
      galleriesMax: 20,
      imagesPerGalleryMax: 30,
      galleriesPerPlaceMax: 3,
      galleriesPerEventMax: 2,
    },
    features: {
      eventsEnabled: true,
      placeSeoEnabled: true,
      extrasEnabled: true,
      customDomainEnabled: false,
      eventLogEnabled: true,
    },
  },
  PRO: {
    limits: {
      placesMax: 150,
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
      customDomainEnabled: true,
      eventLogEnabled: true,
    },
  },
} as const;

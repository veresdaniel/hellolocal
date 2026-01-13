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

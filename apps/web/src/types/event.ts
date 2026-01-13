import type { BaseEntity } from "./base-entity";

export type Event = BaseEntity & {
  type: "event";
  placeId?: string | null;
  placeSlug?: string | null;
  placeName?: string | null;
  startDate: string; // ISO date string
  endDate?: string | null; // ISO date string
  isPinned: boolean;
  shortDescription?: string; // HTML - for list view cards
  rating?: {
    avg: number | null; // Average rating (1-5)
    count: number | null; // Number of ratings
  };
};


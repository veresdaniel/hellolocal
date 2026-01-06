import type { Seo } from "./seo";

export type PlaceCategory =
  | "winery"
  | "food_producer"
  | "craft"
  | "hospitality"
  | "accommodation";

export type PriceBand = "budget" | "mid" | "premium" | "luxury";

export type GeoPoint = { lat: number; lng: number };

export type Place = {
  id: string;
  slug: string;

  tenantSlug: string;
  townSlug: string;

  category: PlaceCategory;
  subcategory?: string;

  name: string;

  // HTML stringet tartalmazhat
  description?: string;

  heroImage?: string;
  gallery?: string[];

  location?: GeoPoint;

  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    // HTML stringet tartalmazhat
    address?: string;
  };

  // HTML stringet tartalmazhat
  openingHours?: string;

  // HTML stringet tartalmazhat
  accessibility?: string;

  priceBand?: PriceBand;
  tags?: string[];

  // category-specifikus, szabad struktúra
  extras?: Record<string, unknown>;

  seo?: Seo;
};

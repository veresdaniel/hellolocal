import type { Seo } from "./seo";

// Category and PriceBand are now dynamic entities (admin-editable)
// They are returned as localized names (strings) from the API
export type PlaceCategory = string; // Localized category name (e.g., "Borászat", "Winery")
export type PriceBand = string | null; // Localized price band name (e.g., "Prémium", "Premium") or null

export type GeoPoint = { lat: number; lng: number };

export type Place = {
  id: string;
  slug: string;

  tenantSlug?: string | null; // tenantKey from API
  townSlug?: string | null;

  category: PlaceCategory | null; // Localized category name
  subcategory?: string;

  name: string;

  // HTML stringet tartalmazhat
  description?: string;
  teaser?: string; // Short description for lists/cards

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

  priceBand?: PriceBand; // Localized price band name or null
  priceBandId?: string | null; // Price band ID
  tags?: string[]; // Array of localized tag names

  // category-specifikus, szabad struktúra
  extras?: Record<string, unknown>;

  seo?: Seo;
};

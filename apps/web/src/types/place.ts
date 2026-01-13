import type { Seo } from "./seo";

// Category and PriceBand are now dynamic entities (admin-editable)
// They are returned as localized names (strings) from the API
export type PlaceCategory = string; // Localized category name (e.g., "Borászat", "Winery")
export type PriceBand = string | null; // Localized price band name (e.g., "Prémium", "Premium") or null

export type GeoPoint = { lat: number; lng: number };

export type Place = {
  id: string;
  slug: string | null; // Can be null if slug hasn't been created yet
  redirected?: boolean; // Whether the slug was redirected to a canonical slug
  tenantRedirected?: boolean; // Whether the tenant key was redirected

  tenantSlug?: string | null; // tenantKey from API
  townSlug?: string | null;

  category: PlaceCategory | null; // Localized category name
  categoryColor?: string | null; // Category color for card border
  subcategory?: string;

  name: string;

  // HTML stringet tartalmazhat
  shortDescription?: string; // HTML - for list view cards
  description?: string;

  heroImage?: string;
  gallery?: string[];

  location?: GeoPoint;

  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    whatsapp?: string;
    // HTML stringet tartalmazhat
    address?: string;
  };

  // Structured opening hours (new format)
  openingHours?: Array<{
    dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    isClosed: boolean;
    openTime: string | null; // Format: "HH:mm"
    closeTime: string | null; // Format: "HH:mm"
  }>;

  // HTML stringet tartalmazhat
  accessibility?: string;

  priceBand?: PriceBand; // Localized price band name or null
  priceBandId?: string | null; // Price band ID
  tags?: string[]; // Array of localized tag names

  // Rating
  rating?: {
    avg: number | null; // Average rating (1-5)
    count: number | null; // Number of ratings
  };

  // category-specifikus, szabad struktúra
  extras?: Record<string, unknown>;

  seo?: Seo;
};

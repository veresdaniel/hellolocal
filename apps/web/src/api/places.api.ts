// src/api/places.api.ts
import { apiGetPublic } from "./client";
import type { Place } from "../types/place";

export interface MapSettings {
  townId: string | null;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

export function getMapSettings(lang: string, tenantKey?: string): Promise<MapSettings> {
  const params = tenantKey ? `?tenantKey=${tenantKey}` : "";
  return apiGetPublic<MapSettings>(`/${lang}/map-settings${params}`);
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  seoTitle: string;
  seoDescription: string;
  defaultPlaceholderCardImage: string | null;
  defaultPlaceholderDetailHeroImage: string | null;
}

export function getSiteSettings(lang: string): Promise<SiteSettings> {
  return apiGetPublic<SiteSettings>(`/${lang}/site-settings`);
}

export function getPlaces(
  lang: string,
  tenantKey?: string,
  category?: string | string[],
  priceBand?: string | string[],
  searchQuery?: string,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  // Add tenantKey if provided (for multi-tenant mode)
  if (tenantKey) {
    params.append("tenantKey", tenantKey);
  }
  // Support multiple categories and price bands (OR logic)
  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    categories.forEach((cat) => params.append("category", cat));
  }
  if (priceBand) {
    const priceBands = Array.isArray(priceBand) ? priceBand : [priceBand];
    priceBands.forEach((pb) => params.append("priceBand", pb));
  }
  if (searchQuery) params.append("q", searchQuery);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  const queryString = params.toString();
  return apiGetPublic<Place[]>(`/${lang}/places${queryString ? `?${queryString}` : ""}`);
}

export function getPlace(lang: string, slug: string) {
  return apiGetPublic<Place>(`/${lang}/places/${slug}`);
}

export interface Category {
  id: string;
  name: string;
}

export interface PriceBand {
  id: string;
  name: string;
}

// Note: These would need to be added to the backend as public endpoints
// For now, we'll use a workaround by fetching from the places data
export async function getCategories(lang: string): Promise<Category[]> {
  // This is a placeholder - in a real implementation, you'd have a public endpoint
  // For now, we'll extract unique categories from places
  const places = await getPlaces(lang, undefined);
  const categoryMap = new Map<string, Category>();
  places.forEach((place) => {
    if (place.category) {
      const categoryName = typeof place.category === "string" ? place.category : String(place.category);
      const categoryId = categoryName.toLowerCase().replace(/\s+/g, "-");
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
        });
      }
    }
  });
  return Array.from(categoryMap.values());
}

export async function getPriceBands(lang: string): Promise<PriceBand[]> {
  // This is a placeholder - in a real implementation, you'd have a public endpoint
  // For now, we'll extract unique price bands from places
  const places = await getPlaces(lang, undefined);
  const priceBandMap = new Map<string, PriceBand>();
  places.forEach((place) => {
    if (place.priceBand) {
      const priceBandName = typeof place.priceBand === "string" ? place.priceBand : String(place.priceBand);
      const priceBandId = priceBandName.toLowerCase().replace(/\s+/g, "-");
      if (!priceBandMap.has(priceBandId)) {
        priceBandMap.set(priceBandId, {
          id: priceBandId,
          name: priceBandName,
        });
      }
    }
  });
  return Array.from(priceBandMap.values());
}

// Events
export interface Event {
  id: string;
  slug: string;
  tenantKey: string | null;
  category: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  heroImage: string | null;
  gallery: string[];
  location: { lat: number; lng: number } | null;
  placeId: string | null;
  placeSlug: string | null;
  placeName: string | null;
  startDate: string;
  endDate: string | null;
  isPinned: boolean;
  tags: string[];
  seo: {
    title: string | null;
    description: string | null;
    image: string | null;
    keywords: string[];
  };
}

export function getEvents(
  lang: string,
  category?: string,
  placeId?: string,
  limit?: number,
  offset?: number,
  tenantKey?: string
) {
  const params = new URLSearchParams();
  if (tenantKey) params.append("tenantKey", tenantKey);
  if (category) params.append("category", category);
  if (placeId) params.append("placeId", placeId);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  const queryString = params.toString();
  return apiGetPublic<Event[]>(`/${lang}/events${queryString ? `?${queryString}` : ""}`);
}

export function getEvent(lang: string, slug: string) {
  return apiGetPublic<Event>(`/${lang}/events/${slug}`);
}

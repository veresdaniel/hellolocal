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
}

export function getSiteSettings(lang: string): Promise<SiteSettings> {
  return apiGetPublic<SiteSettings>(`/${lang}/site-settings`);
}

export function getPlaces(
  lang: string,
  category?: string,
  priceBand?: string,
  searchQuery?: string,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (priceBand) params.append("priceBand", priceBand);
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
  const places = await getPlaces(lang);
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
  const places = await getPlaces(lang);
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

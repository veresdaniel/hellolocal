// src/api/places.api.ts
import { apiGetPublic } from "./client";
import type { Place } from "../types/place";

export interface MapSettings {
  townId: string | null;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

export function getMapSettings(lang: string, siteKey?: string): Promise<MapSettings> {
  // Map settings are part of platform settings
  // Use platform settings endpoint and extract map settings from it
  const effectiveSiteKey = siteKey || "default";
  return apiGetPublic<PlatformSettingsDto>(`/public/${lang}/${effectiveSiteKey}/platform`).then(
    (dto) => ({
      townId: null, // Not available in platform settings
      lat: dto.map?.center?.lat || null,
      lng: dto.map?.center?.lng || null,
      zoom: dto.map?.zoom || null,
    })
  );
}

// Legacy PlatformSettings interface - kept for backward compatibility
// New code should use PlatformSettingsDto from types/platformSettings.ts
export interface PlatformSettings extends PlatformSettingsDto {
  // Legacy fields for backward compatibility
  siteName: string;
  siteDescription: string;
  seoTitle: string;
  seoDescription: string;
  defaultPlaceholderCardImage: string | null;
  defaultPlaceholderDetailHeroImage: string | null;
  defaultEventPlaceholderCardImage: string | null;
  brandBadgeIcon: string | null;
  faviconUrl: string | null;
  // Additional fields (already in PlatformSettingsDto, but explicitly listed for clarity)
  seoImage?: string | null;
  isCrawlable?: boolean; // Derived from seo.indexable
  featureMatrix?: {
    planOverrides?: any;
    placePlanOverrides?: any;
  };
}

// Legacy function - maps to new API endpoint
export function getPlatformSettings(lang: string, siteKey?: string): Promise<PlatformSettings> {
  // Use new unified platform-settings endpoint with path parameters
  // If siteKey is not provided, use "default" as fallback
  const effectiveSiteKey = siteKey || "default";
  return apiGetPublic<PlatformSettingsDto>(`/public/${lang}/${effectiveSiteKey}/platform`).then(
    (dto) => ({
      ...dto, // Include all PlatformSettingsDto fields
      // Legacy fields for backward compatibility
      siteName: dto.site.name,
      siteDescription: dto.site.description || "",
      seoTitle: dto.seo.defaultTitle || "",
      seoDescription: dto.seo.defaultDescription || "",
      defaultPlaceholderCardImage: dto.placeholders.placeCard || null,
      defaultPlaceholderDetailHeroImage: dto.placeholders.placeHero || null,
      defaultEventPlaceholderCardImage: dto.placeholders.eventCard || null,
      brandBadgeIcon: dto.placeholders.avatar || null,
      faviconUrl: dto.brand.faviconUrl || null,
      // Additional fields
      seoImage: dto.seoImage || null,
      isCrawlable: dto.seo.indexable,
      featureMatrix: dto.featureMatrix,
    })
  );
}

// Import new DTO type
import type { PlatformSettingsDto } from "../types/platformSettings";

export function getPlaces(
  lang: string,
  siteKey: string,
  category?: string | string[],
  priceBand?: string | string[],
  searchQuery?: string,
  limit?: number,
  offset?: number
) {
  const effectiveSiteKey = siteKey || "default";
  const params = new URLSearchParams();
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
  return apiGetPublic<Place[]>(
    `/public/${lang}/${effectiveSiteKey}/places${queryString ? `?${queryString}` : ""}`
  );
}

export function getPlace(lang: string, slug: string, siteKey: string) {
  return apiGetPublic<Place>(`/public/${lang}/${siteKey}/places/${slug}`);
}

/**
 * Gets a place by its entity ID (stable, future-proof).
 * This should be used after slug resolution to fetch place data by ID.
 *
 * @param lang - Language code (hu, en, de)
 * @param siteKey - Site key from URL
 * @param placeId - Place entity ID
 * @returns Place data
 */
export function getPlaceById(lang: string, siteKey: string, placeId: string) {
  return apiGetPublic<Place>(`/public/${lang}/${siteKey}/places/by-id/${placeId}`);
}

// Price List API
export interface PriceListBlock {
  title: string;
  items: Array<{
    label: string;
    price: number | null;
    note?: string;
  }>;
}

export interface PublicPriceList {
  id: string;
  placeId: string;
  currency: string;
  blocks: PriceListBlock[];
  note: string | null;
}

export function getPlacePriceList(lang: string, siteKey: string, placeId: string) {
  return apiGetPublic<PublicPriceList>(
    `/public/${lang}/${siteKey}/places/by-id/${placeId}/pricelist`
  );
}

// Floorplan API
export interface PublicFloorplanPin {
  id: string;
  floorplanId: string;
  x: number;
  y: number;
  label: string | null;
  sortOrder: number;
}

export interface PublicFloorplan {
  id: string;
  placeId: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
  pins?: PublicFloorplanPin[];
}

export function getPlaceFloorplans(lang: string, siteKey: string, placeId: string) {
  return apiGetPublic<PublicFloorplan[]>(
    `/public/${lang}/${siteKey}/places/by-id/${placeId}/floorplans`
  );
}

// Gallery API
export interface GalleryImage {
  id: string;
  src: string;
  thumbSrc?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
}

export interface PublicGallery {
  id: string;
  siteId: string;
  placeId?: string | null;
  eventId?: string | null;
  name?: string | null;
  images: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getGallery(lang: string, siteKey: string, galleryId: string) {
  return apiGetPublic<PublicGallery>(`/public/${lang}/${siteKey}/galleries/${galleryId}`);
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
// OPTIMIZED: Use cached places data if available to avoid duplicate API calls
let cachedPlacesForExtraction: {
  lang: string;
  siteKey?: string;
  tenantKey?: string;
  places: Place[];
  timestamp: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function getCategories(
  lang: string,
  siteKey?: string,
  useCachedPlaces?: Place[]
): Promise<Category[]> {
  // If places are provided, use them directly (no API call needed)
  if (useCachedPlaces) {
    const categoryMap = new Map<string, Category>();
    useCachedPlaces.forEach((place) => {
      if (place.category) {
        const categoryName =
          typeof place.category === "string" ? place.category : String(place.category);
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

  // Check cache first
  if (
    cachedPlacesForExtraction &&
    cachedPlacesForExtraction.lang === lang &&
    (cachedPlacesForExtraction.siteKey === siteKey ||
      cachedPlacesForExtraction.tenantKey === siteKey) &&
    Date.now() - cachedPlacesForExtraction.timestamp < CACHE_TTL
  ) {
    const categoryMap = new Map<string, Category>();
    cachedPlacesForExtraction.places.forEach((place) => {
      if (place.category) {
        const categoryName =
          typeof place.category === "string" ? place.category : String(place.category);
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

  // Fetch places and cache them
  const places = await getPlaces(lang, siteKey || "");
  cachedPlacesForExtraction = { lang, siteKey, tenantKey: siteKey, places, timestamp: Date.now() };

  const categoryMap = new Map<string, Category>();
  places.forEach((place) => {
    if (place.category) {
      const categoryName =
        typeof place.category === "string" ? place.category : String(place.category);
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

export async function getPriceBands(
  lang: string,
  siteKey?: string,
  useCachedPlaces?: Place[]
): Promise<PriceBand[]> {
  // If places are provided, use them directly (no API call needed)
  if (useCachedPlaces) {
    const priceBandMap = new Map<string, PriceBand>();
    useCachedPlaces.forEach((place) => {
      if (place.priceBand) {
        const priceBandName =
          typeof place.priceBand === "string" ? place.priceBand : String(place.priceBand);
        const priceBandId = place.priceBandId || priceBandName.toLowerCase().replace(/\s+/g, "-");
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

  // Check cache first
  if (
    cachedPlacesForExtraction &&
    cachedPlacesForExtraction.lang === lang &&
    (cachedPlacesForExtraction.siteKey === siteKey ||
      cachedPlacesForExtraction.tenantKey === siteKey) &&
    Date.now() - cachedPlacesForExtraction.timestamp < CACHE_TTL
  ) {
    const priceBandMap = new Map<string, PriceBand>();
    cachedPlacesForExtraction.places.forEach((place) => {
      if (place.priceBand) {
        const priceBandName =
          typeof place.priceBand === "string" ? place.priceBand : String(place.priceBand);
        const priceBandId = place.priceBandId || priceBandName.toLowerCase().replace(/\s+/g, "-");
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

  // Fetch places and cache them
  const places = await getPlaces(lang, siteKey || "");
  cachedPlacesForExtraction = { lang, siteKey, tenantKey: siteKey, places, timestamp: Date.now() };

  const priceBandMap = new Map<string, PriceBand>();
  places.forEach((place) => {
    if (place.priceBand) {
      const priceBandName =
        typeof place.priceBand === "string" ? place.priceBand : String(place.priceBand);
      const priceBandId = place.priceBandId || priceBandName.toLowerCase().replace(/\s+/g, "-");
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
  redirected?: boolean; // Whether the slug was redirected to a canonical slug
  siteRedirected?: boolean; // Whether the site key was redirected
  siteKey: string | null;
  category: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  heroImage: string | null;
  location: { lat: number; lng: number } | null;
  placeId: string | null;
  placeSlug: string | null;
  placeName: string | null;
  startDate: string;
  endDate: string | null;
  isPinned: boolean;
  isRainSafe: boolean;
  showOnMap: boolean;
  tags: string[];
  rating?: {
    avg: number | null; // Average rating (1-5)
    count: number | null; // Number of ratings
  };
  seo: {
    title: string | null;
    description: string | null;
    image: string | null;
    keywords: string[];
  };
}

export function getEvents(
  lang: string,
  siteKey: string,
  category?: string,
  placeId?: string,
  limit?: number,
  offset?: number
) {
  const effectiveSiteKey = siteKey || "default";
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (placeId) params.append("placeId", placeId);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  const queryString = params.toString();
  return apiGetPublic<Event[]>(
    `/public/${lang}/${effectiveSiteKey}/events${queryString ? `?${queryString}` : ""}`
  );
}

export function getEvent(lang: string, slug: string, siteKey: string) {
  return apiGetPublic<Event>(`/public/${lang}/${siteKey}/events/${slug}`);
}

/**
 * Gets an event by its entity ID (stable, future-proof).
 * This should be used after slug resolution to fetch event data by ID.
 *
 * @param lang - Language code (hu, en, de)
 * @param siteKey - Site key from URL
 * @param eventId - Event entity ID
 * @returns Event data
 */
export function getEventById(lang: string, siteKey: string, eventId: string) {
  return apiGetPublic<Event>(`/public/${lang}/${siteKey}/events/by-id/${eventId}`);
}

// Sites (public API)
export interface Site {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  heroImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  seoKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export function getSites(
  lang: string,
  siteKey: string,
  searchQuery?: string,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  if (searchQuery) params.append("q", searchQuery);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  const queryString = params.toString();
  return apiGetPublic<Site[]>(
    `/public/${lang}/${siteKey}/sites${queryString ? `?${queryString}` : ""}`
  );
}

export function getSite(lang: string, slug: string, siteKey: string) {
  return apiGetPublic<Site>(`/public/${lang}/${siteKey}/sites/${slug}`);
}

// Collections
export interface CollectionView {
  id: string;
  slug: string;
  domain?: string | null;
  isCrawlable: boolean;
  title: string;
  description?: string | null;
  heroImage?: string | null;
  seo: {
    title: string;
    description?: string | null;
    image?: string | null;
    keywords?: string[];
  };
  items: Array<{
    id: string;
    siteId: string;
    siteSlug: string;
    order: number;
    isHighlighted: boolean;
    title: string;
    description?: string | null;
    image?: string | null;
  }>;
}

export function getCollectionByDomain(domain: string, lang?: string) {
  const langParam = lang ? `?lang=${lang}` : "";
  return apiGetPublic<CollectionView>(`/public/collections/by-domain/${domain}${langParam}`);
}

export function getCollectionBySlug(slug: string, lang?: string) {
  const langParam = lang ? `?lang=${lang}` : "";
  return apiGetPublic<CollectionView>(`/public/collections/by-slug/${slug}${langParam}`);
}

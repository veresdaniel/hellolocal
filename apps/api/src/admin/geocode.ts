export type GeocodeHit = {
  lat: number;
  lng: number;
  label: string;
  source: "google" | "nominatim";
};

/**
 * Prefer Google Geocoding when GOOGLE_MAPS_API_KEY is set.
 * Otherwise use OpenStreetMap Nominatim so a suggestion still appears.
 */
export async function geocodeQuery(query: string): Promise<GeocodeHit | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (key) {
    const google = await geocodeGoogle(query, key);
    if (google) return google;
  }
  return geocodeNominatim(query);
}

async function geocodeGoogle(query: string, key: string): Promise<GeocodeHit | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "hu");
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  const hit = data.results?.[0];
  const lat = hit?.geometry?.location?.lat;
  const lng = hit?.geometry?.location?.lng;
  if (data.status !== "OK" || lat == null || lng == null) return null;
  return { lat, lng, label: hit?.formatted_address || query, source: "google" };
}

async function geocodeNominatim(query: string): Promise<GeocodeHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, {
    headers: { "User-Agent": "HelloLocal/1.0 (admin geocode)", Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const hit = data[0];
  const lat = hit?.lat != null ? Number(hit.lat) : NaN;
  const lng = hit?.lon != null ? Number(hit.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: hit?.display_name || query, source: "nominatim" };
}

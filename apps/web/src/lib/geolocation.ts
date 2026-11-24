/** Shared geolocation options for map / PWA location tracking. */

export type GeoPoint = { lat: number; lng: number };

/** Fresh fix — do not reuse a cached OS position after the user moved. */
export const GEO_FRESH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000,
};

/** Continuous updates while the app is open / moving. */
export const GEO_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

export function coordsFromPosition(position: GeolocationPosition): GeoPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

export function clearGeoWatch(watchId: number | null): void {
  if (watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

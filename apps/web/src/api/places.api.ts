// src/api/places.api.ts
import { apiGet } from "./client";
import type { Place } from "../types/place";

export function getPlaces(lang: string) {
  return apiGet<Place[]>(`/${lang}/places`);
}

export function getPlace(lang: string, slug: string) {
  return apiGet<Place>(`/${lang}/places/${slug}`);
}

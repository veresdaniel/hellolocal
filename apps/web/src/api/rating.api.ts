// src/api/rating.api.ts
import { apiGet, apiPost } from "./client";

export interface RatingResponse {
  placeId: string;
  userId: string;
  value: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export type MyRatingResponse = {
  value: number;
  createdAt: string;
  updatedAt: string;
} | null;

/**
 * Creates or updates a rating for a place.
 * Requires authentication.
 */
export function createOrUpdateRating(
  lang: string,
  placeId: string,
  value: number
): Promise<RatingResponse> {
  return apiPost<RatingResponse>(`/${lang}/places/${placeId}/rating`, { value });
}

/**
 * Gets the current user's rating for a place.
 * Requires authentication.
 * Returns null if the user hasn't rated the place yet.
 */
export function getMyRating(lang: string, placeId: string): Promise<MyRatingResponse> {
  return apiGet<MyRatingResponse>(`/${lang}/places/${placeId}/rating/me`);
}

/**
 * Creates or updates a rating for an event.
 * Requires authentication.
 */
export function createOrUpdateEventRating(
  lang: string,
  eventId: string,
  value: number
): Promise<RatingResponse> {
  return apiPost<RatingResponse>(`/${lang}/events/${eventId}/rating`, { value });
}

/**
 * Gets the current user's rating for an event.
 * Requires authentication.
 * Returns null if the user hasn't rated the event yet.
 */
export function getMyEventRating(lang: string, eventId: string): Promise<MyRatingResponse> {
  return apiGet<MyRatingResponse>(`/${lang}/events/${eventId}/rating/me`);
}

/**
 * Platform-wide OG/share image fallback (AppSetting).
 * Cascade bottom: site seoImage / hero → brand placeholder → this setting → FALLBACK_SHARE_IMAGE_PATH.
 */

/** AppSetting key for the platform-wide Open Graph / social share fallback image. */
export const DEFAULT_SHARE_IMAGE_KEY = "platform.defaultShareImage";

/** Built-in marketing image used when no AppSetting or site SEO image is set. */
export const FALLBACK_SHARE_IMAGE_PATH = "/marketing/map-szeged.jpg";

/** Normalize a share image URL or path. Empty clears the override. */
export function normalizeShareImageUrl(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return value;
  return "";
}

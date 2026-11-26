/**
 * Platform overview marketing images (hero / stories / closing / share).
 * Stored as AppSetting JSON: { [lang]: { hero?, maker?, …, share? } }.
 * Values are Cloudinary (or any https) URLs — delivery uses on-the-fly transforms.
 */

export const LANDING_IMAGES_KEY = "platform.landingImages";

export const LANDING_IMAGE_SLOTS = [
  "hero",
  "mobile",
  "maker",
  "service",
  "quiet",
  "civic",
  "town",
  "closing",
  "share",
] as const;

export type LandingImageSlot = (typeof LANDING_IMAGE_SLOTS)[number];

export type LandingImagesForLang = Partial<Record<LandingImageSlot, string>>;

export type LandingImagesByLang = Record<string, LandingImagesForLang>;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return value.startsWith("/");
  }
}

/** Parse + sanitize AppSetting JSON. Drops empty / non-URL values. */
export function parseLandingImages(raw: string | null | undefined): LandingImagesByLang {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: LandingImagesByLang = {};
    for (const [lang, slots] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^[a-z]{2,3}$/.test(lang) || !slots || typeof slots !== "object" || Array.isArray(slots)) {
        continue;
      }
      const next: LandingImagesForLang = {};
      for (const slot of LANDING_IMAGE_SLOTS) {
        const value = (slots as Record<string, unknown>)[slot];
        if (typeof value !== "string") continue;
        const trimmed = value.trim().slice(0, 2000);
        if (!trimmed || !isHttpUrl(trimmed)) continue;
        next[slot] = trimmed;
      }
      if (Object.keys(next).length) out[lang] = next;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeLandingImages(images: LandingImagesByLang): string {
  const clean = parseLandingImages(JSON.stringify(images));
  return JSON.stringify(clean);
}

/** Prefer lang-specific slot, then `en`, then `hu`, then any lang that has it. */
export function pickLandingImage(
  images: LandingImagesByLang | null | undefined,
  lang: string,
  slot: LandingImageSlot
): string | null {
  if (!images) return null;
  const code = String(lang || "").toLowerCase().split("-")[0];
  const order = [code, "en", "hu", ...Object.keys(images)];
  for (const key of order) {
    const value = images[key]?.[slot]?.trim();
    if (value) return value;
  }
  return null;
}

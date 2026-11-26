/**
 * Resolve platform CMS (Cloudinary) URLs over bundled marketing ladders.
 * When a CMS URL is set, build a responsive MarketingImage via on-the-fly widths.
 */
import { preferModernImageUrl } from "../seo/cloudinaryImage";
import type { MarketingImage } from "./overviewImages";
import {
  OVERVIEW_CLOSING,
  OVERVIEW_HERO_MAP,
  OVERVIEW_STORY_IMAGES,
} from "./overviewImages";

export const LANDING_IMAGE_SLOTS = [
  "hero",
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

function ladderFromUrl(url: string, fallback: MarketingImage, widths: number[]): MarketingImage {
  const srcset = widths
    .map((w) => `${preferModernImageUrl(url, { width: w }) || url} ${w}w`)
    .join(", ");
  const mobileWidths = widths.filter((w) => w <= 720);
  const defaultW = widths.includes(720) ? 720 : widths[Math.min(1, widths.length - 1)];
  const webp = preferModernImageUrl(url, { width: defaultW }) || url;
  return {
    jpg: url,
    webp,
    width: fallback.width,
    height: fallback.height,
    webpSrcSet: srcset,
    webpSrcSetMobile: mobileWidths.length
      ? mobileWidths.map((w) => `${preferModernImageUrl(url, { width: w }) || url} ${w}w`).join(", ")
      : undefined,
    mobileMedia: mobileWidths.length ? "(max-width: 860px)" : undefined,
    jpgSrcSet: `${url} ${defaultW}w`,
    sizes: fallback.sizes,
  };
}

export function resolveHeroImage(
  images: LandingImagesByLang | null | undefined,
  lang: string
): MarketingImage {
  const url = pickLandingImage(images, lang, "hero");
  return url ? ladderFromUrl(url, OVERVIEW_HERO_MAP, [480, 720, 960]) : OVERVIEW_HERO_MAP;
}

export function resolveStoryImage(
  images: LandingImagesByLang | null | undefined,
  lang: string,
  key: keyof typeof OVERVIEW_STORY_IMAGES
): MarketingImage {
  const url = pickLandingImage(images, lang, key);
  const fallback = OVERVIEW_STORY_IMAGES[key];
  return url ? ladderFromUrl(url, fallback, [480, 720, 960, 1100]) : fallback;
}

export function resolveClosingImage(
  images: LandingImagesByLang | null | undefined,
  lang: string
): MarketingImage {
  const url = pickLandingImage(images, lang, "closing");
  return url ? ladderFromUrl(url, OVERVIEW_CLOSING, [480, 720, 960, 1100]) : OVERVIEW_CLOSING;
}

export function resolveShareImage(
  images: LandingImagesByLang | null | undefined,
  lang: string,
  platformDefault?: string | null
): string | null {
  return pickLandingImage(images, lang, "share") || platformDefault || null;
}

function isHttpOrPathUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return value.startsWith("/");
  }
}

/** Align with API `parseLandingImages` — drop invalid langs / non-URL values. */
export function parseLandingImagesJson(raw: string | null | undefined): LandingImagesByLang {
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
        if (!trimmed || !isHttpOrPathUrl(trimmed)) continue;
        next[slot] = trimmed;
      }
      if (Object.keys(next).length) out[lang] = next;
    }
    return out;
  } catch {
    return {};
  }
}

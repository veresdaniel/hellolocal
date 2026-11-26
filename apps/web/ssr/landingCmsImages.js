/**
 * SSR mirror of src/marketing/landingCmsImages.ts — keep slot names in sync.
 * Cloudinary URLs: inject f_auto,q_auto,w_ for delivery (same idea as preferModernImageUrl).
 */

import { OVERVIEW_HERO_MAP, OVERVIEW_STORY_IMAGES, pictureHtml } from "./overviewImages.js";

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
];

/**
 * @param {Record<string, Record<string, string>> | null | undefined} images
 * @param {string} lang
 * @param {string} slot
 */
export function pickLandingImage(images, lang, slot) {
  if (!images || typeof images !== "object") return null;
  const code = String(lang || "")
    .toLowerCase()
    .split("-")[0];
  for (const key of [code, "en", "hu", ...Object.keys(images)]) {
    const value = images[key]?.[slot];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * @param {string} url
 * @param {number} [width]
 */
function cloudinarySized(url, width) {
  if (!url || !/res\.cloudinary\.com/i.test(url) || !/\/upload\//.test(url)) return url;
  if (/\/upload\/(?:[^/]+,)*f_auto/.test(url)) return url;
  const transform = width ? `f_auto,q_auto,w_${width},c_limit` : "f_auto,q_auto";
  return url.replace(/\/upload\//, `/upload/${transform}/`);
}

/**
 * @param {string} url
 * @param {{ width: number, height: number, sizes: string }} fallback
 * @param {number[]} widths
 * @param {{ eager?: boolean }} [opts]
 */
function pictureFromUrl(url, fallback, widths, opts = {}) {
  const mobile = widths.filter((w) => w <= 720);
  const defaultW = widths.includes(720) ? 720 : widths[0];
  const img = {
    jpg: url,
    webp: cloudinarySized(url, defaultW),
    width: fallback.width,
    height: fallback.height,
    webpSrcSet: widths.map((w) => `${cloudinarySized(url, w)} ${w}w`).join(", "),
    webpSrcSetMobile: mobile.map((w) => `${cloudinarySized(url, w)} ${w}w`).join(", "),
    mobileMedia: "(max-width: 860px)",
    sizes: fallback.sizes,
  };
  return pictureHtml(img, opts.alt || "", { eager: opts.eager });
}

/**
 * @param {Record<string, Record<string, string>> | null | undefined} images
 * @param {string} lang
 * @param {string} alt
 */
export function heroPictureHtml(images, lang, alt) {
  const url = pickLandingImage(images, lang, "hero");
  if (!url) return pictureHtml(OVERVIEW_HERO_MAP, alt, { eager: true });
  return pictureFromUrl(url, OVERVIEW_HERO_MAP, [480, 720, 960], { eager: true, alt });
}

/**
 * @param {Record<string, Record<string, string>> | null | undefined} images
 * @param {string} lang
 * @param {"mobile"|"maker"|"service"|"quiet"|"civic"|"town"} key
 * @param {string} alt
 */
export function storyPictureHtml(images, lang, key, alt) {
  const url = pickLandingImage(images, lang, key);
  const fallback = OVERVIEW_STORY_IMAGES[key];
  if (!url) return pictureHtml(fallback, alt);
  return pictureFromUrl(url, fallback, [480, 720, 960, 1100], { alt });
}

/**
 * LCP preload href for CMS hero (or bundled fallback).
 * @param {Record<string, Record<string, string>> | null | undefined} images
 * @param {string} lang
 */
export function lcpPreloadHref(images, lang) {
  const url = pickLandingImage(images, lang, "hero");
  if (!url) return "/marketing/map-szeged-480.webp";
  return cloudinarySized(url, 480);
}

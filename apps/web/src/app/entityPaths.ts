// Language-specific public path segments for the Site/Town/Place hierarchy.
// Model names stay Site/Town/Place in code; URL labels match UI terminology per locale.
import type { Lang } from "./config";

/** Site (tenant) list — Régió / Region / Region */
export const REGION_LIST_PATH: Record<Lang, string> = {
  hu: "regiok",
  en: "regions",
  de: "regionen",
};

/** Legacy + current region-list segments → language */
export const REGION_LIST_ALIASES: Record<string, Lang> = {
  regiok: "hu",
  teruletek: "hu", // legacy Hungarian label
  regions: "en",
  regionen: "de",
};

/** Place detail — Hely / Place / Ort */
export const PLACE_PATH: Record<Lang, string> = {
  hu: "hely",
  en: "place",
  de: "ort",
};

export const PLACE_PATH_ALIASES = ["hely", "place", "ort"] as const;

/** Town filter / index — Település / Town / Gemeinde */
export const TOWN_PATH: Record<Lang, string> = {
  hu: "telepules",
  en: "town",
  de: "gemeinde",
};

export const TOWN_PATH_ALIASES = ["telepules", "town", "gemeinde"] as const;

function asLang(lang: string): Lang {
  return (lang === "en" || lang === "de" ? lang : "hu") as Lang;
}

export function regionListSegment(lang: string): string {
  return REGION_LIST_PATH[asLang(lang)];
}

export function placeSegment(lang: string): string {
  return PLACE_PATH[asLang(lang)];
}

export function townSegment(lang: string): string {
  return TOWN_PATH[asLang(lang)];
}

export function isPlacePathSegment(segment: string | undefined): boolean {
  return !!segment && (PLACE_PATH_ALIASES as readonly string[]).includes(segment);
}

export function isTownPathSegment(segment: string | undefined): boolean {
  return !!segment && (TOWN_PATH_ALIASES as readonly string[]).includes(segment);
}

export function isRegionListPathSegment(segment: string | undefined): boolean {
  return !!segment && segment in REGION_LIST_ALIASES;
}

/** Relative path under `/:lang/:siteKey/` for a place detail URL. */
export function placeEntityPath(lang: string, slug: string): string {
  return `${PLACE_PATH[asLang(lang)]}/${slug}`;
}

/** Relative path under `/:lang/:siteKey/` for a town-scoped explore URL. */
export function townEntityPath(lang: string, slug: string): string {
  return `${TOWN_PATH[asLang(lang)]}/${slug}`;
}

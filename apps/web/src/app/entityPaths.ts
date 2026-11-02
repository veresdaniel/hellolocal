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
  const code = lang.split("-")[0];
  return (code === "en" || code === "de" ? code : "hu") as Lang;
}

export type LegalPageKey = "imprint" | "terms" | "privacy";

/** Impresszum / ÁSZF / adatvédelem, in the language of the page. */
export const LEGAL_PATH: Record<Lang, Record<LegalPageKey, string>> = {
  hu: { imprint: "impresszum", terms: "aszf", privacy: "adatvedelem" },
  en: { imprint: "imprint", terms: "terms", privacy: "privacy" },
  de: { imprint: "impressum", terms: "agb", privacy: "datenschutz" },
};

export const LEGAL_PATH_ALIASES = [
  "impresszum",
  "aszf",
  "adatvedelem",
  "imprint",
  "terms",
  "privacy",
  "impressum",
  "agb",
  "datenschutz",
] as const;

const LEGAL_KEY_BY_SEGMENT: Record<string, LegalPageKey> = {
  impresszum: "imprint",
  imprint: "imprint",
  impressum: "imprint",
  aszf: "terms",
  terms: "terms",
  agb: "terms",
  adatvedelem: "privacy",
  privacy: "privacy",
  datenschutz: "privacy",
};

export function legalSegment(lang: string, key: LegalPageKey): string {
  return LEGAL_PATH[asLang(lang)][key];
}

export function legalKeyFromSegment(segment: string | undefined): LegalPageKey | null {
  if (!segment) return null;
  return LEGAL_KEY_BY_SEGMENT[segment] ?? null;
}

export function pathnameHasLegal(pathname: string, key: LegalPageKey): boolean {
  return pathname.split("/").some((part) => LEGAL_KEY_BY_SEGMENT[part] === key);
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

/** Town slug from `/telepules|:town|:gemeinde/:slug`, if the path has one. */
export function townSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (isTownPathSegment(parts[i]) && parts[i + 1]) return parts[i + 1];
  }
  return null;
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

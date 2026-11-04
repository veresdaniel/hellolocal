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

/** List view of a town. The map is the bare town path; the list keeps a word. */
export const LIST_VIEW_PATH: Record<Lang, string> = {
  hu: "lista",
  en: "list",
  de: "liste",
};

export const LIST_VIEW_ALIASES = ["lista", "list", "liste"] as const;

/** Explicit map word. The canonical map URL has no suffix; these redirect to it. */
export const MAP_VIEW_PATH: Record<Lang, string> = {
  hu: "terkep",
  en: "map",
  de: "karte",
};

export const MAP_VIEW_ALIASES = ["terkep", "map", "karte"] as const;

function asLang(lang: string): Lang {
  const code = lang.split("-")[0];
  return (code === "en" || code === "de" ? code : "hu") as Lang;
}

/** Sales overview. The word follows the page language, like the menu label. */
export const OVERVIEW_PATH: Record<Lang, string> = {
  hu: "attekintes",
  en: "overview",
  de: "ueberblick",
};

export const OVERVIEW_PATH_ALIASES = ["attekintes", "overview", "ueberblick"] as const;

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

const RESERVED_PUBLIC_SEGMENTS = new Set<string>([
  ...PLACE_PATH_ALIASES,
  ...TOWN_PATH_ALIASES,
  ...OVERVIEW_PATH_ALIASES,
  ...LEGAL_PATH_ALIASES,
  ...LIST_VIEW_ALIASES,
  ...MAP_VIEW_ALIASES,
  "event",
  "collections",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "pricing",
  "tarife",
  "preise",
  "static-pages",
  "static-page",
  "products",
  "offline",
  "admin",
  "regiok",
  "regions",
  "regionen",
  "teruletek",
]);

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

export function overviewSegment(lang: string): string {
  return OVERVIEW_PATH[asLang(lang)];
}

export function isOverviewPathSegment(segment: string | undefined): boolean {
  return !!segment && (OVERVIEW_PATH_ALIASES as readonly string[]).includes(segment);
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

export function listViewSegment(lang: string): string {
  return LIST_VIEW_PATH[asLang(lang)];
}

export function mapViewSegment(lang: string): string {
  return MAP_VIEW_PATH[asLang(lang)];
}

export function isListViewSegment(segment: string | undefined): boolean {
  return !!segment && (LIST_VIEW_ALIASES as readonly string[]).includes(segment);
}

export function isMapViewSegment(segment: string | undefined): boolean {
  return !!segment && (MAP_VIEW_ALIASES as readonly string[]).includes(segment);
}

export function isExploreViewSegment(segment: string | undefined): boolean {
  return isListViewSegment(segment) || isMapViewSegment(segment);
}

/** A path word that is never a town slug (place, event, list, legal, …). */
export function isReservedPublicSegment(segment: string | undefined): boolean {
  return !!segment && RESERVED_PUBLIC_SEGMENTS.has(segment);
}

/** Curator list slug from `/collections/:slug`, if the path has one. */
export function collectionSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("collections");
  if (index >= 0 && parts[index + 1]) return parts[index + 1];
  return null;
}

/** Place slug from `/hely|:place|:ort/:slug`, if the path has one. */
export function placeSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (isPlacePathSegment(parts[i]) && parts[i + 1]) return parts[i + 1];
  }
  return null;
}

/** Event slug from `/event/:slug`, if the path has one. */
export function eventSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("event");
  if (index >= 0 && parts[index + 1]) return parts[index + 1];
  return null;
}

/**
 * Town slug from `/etyek-budai/etyek` or `/etyek-budai/etyek/terkep`.
 * A region host's `/etyek` is a town only when `scope.kind` is `site`.
 */
export function townSlugFromPath(
  pathname: string,
  scope?: { kind?: string; siteSlug?: string; entitySlug?: string }
): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const body = parts[0] === "hu" || parts[0] === "en" || parts[0] === "de" ? parts.slice(1) : [...parts];
  const hadView = isExploreViewSegment(body[body.length - 1]);
  if (hadView) body.pop();
  if (body.some((part) => isPlacePathSegment(part) || part === "event" || part === "collections" || part === "static-page")) {
    return null;
  }
  const town = body[body.length - 1];
  if (!town || isReservedPublicSegment(town)) {
    if (scope?.kind === "town" && scope.entitySlug) return scope.entitySlug;
    return null;
  }
  if (body.length >= 2) return town;
  if (hadView) {
    if (scope?.kind === "site" && town !== scope.siteSlug) return town;
    return null;
  }
  if (scope?.kind === "town" && scope.entitySlug) return scope.entitySlug;
  if (scope?.kind === "site" && town !== scope.siteSlug) return town;
  return null;
}

/** `map` on terkep/map/karte. The bare town path is the directory. */
export function exploreViewFromPath(pathname: string): "map" | "list" | null {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (isMapViewSegment(last)) return "map";
  if (townSlugFromPath(pathname)) return "list";
  return null;
}

export function isRegionListPathSegment(segment: string | undefined): boolean {
  return !!segment && segment in REGION_LIST_ALIASES;
}

/** Relative path under `/:lang/:siteKey/` for a place detail URL. */
export function placeEntityPath(lang: string, slug: string): string {
  return `${PLACE_PATH[asLang(lang)]}/${slug}`;
}

/**
 * Town directory is `etyek`. The map is `etyek/terkep` (map/karte).
 */
export function townEntityPath(lang: string, slug: string, view: "map" | "list" = "list"): string {
  if (view === "map") return `${slug}/${mapViewSegment(lang)}`;
  return slug;
}

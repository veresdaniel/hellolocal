// Language-specific public path segments for the Site/Town/Place hierarchy.
// Runtime values come from /api/public/ui/path-segments (UiPathSegment); boot uses fallbacks.
import type { Lang } from "./config";
import {
  aliasesForKey,
  isPathSegmentForKey,
  isReservedPathWord,
  pathSegment,
  pathSegmentKey,
} from "./pathSegmentsStore";

/** @deprecated Prefer regionListSegment(lang) — kept for typed call sites. */
export const REGION_LIST_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "regiok",
  en: "regions",
  de: "regionen",
};

/** Legacy + current region-list segments → language (static boot; runtime via store). */
export const REGION_LIST_ALIASES: Record<string, Lang> = {
  regiok: "hu",
  teruletek: "hu",
  regions: "en",
  regionen: "de",
};

/** @deprecated Prefer placeSegment(lang). */
export const PLACE_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "hely",
  en: "place",
  de: "ort",
};

export const PLACE_PATH_ALIASES = ["hely", "place", "ort"] as const;

/** @deprecated Prefer townSegment(lang). */
export const TOWN_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "telepules",
  en: "town",
  de: "gemeinde",
};

export const TOWN_PATH_ALIASES = ["telepules", "town", "gemeinde"] as const;

/** @deprecated Prefer listViewSegment(lang). */
export const LIST_VIEW_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "lista",
  en: "list",
  de: "liste",
};

export const LIST_VIEW_ALIASES = ["lista", "list", "liste"] as const;

/** @deprecated Prefer mapViewSegment(lang). */
export const MAP_VIEW_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "terkep",
  en: "map",
  de: "karte",
};

export const MAP_VIEW_ALIASES = ["terkep", "map", "karte"] as const;

/** @deprecated Prefer overviewSegment(lang). */
export const OVERVIEW_PATH: Record<"hu" | "en" | "de", string> = {
  hu: "attekintes",
  en: "overview",
  de: "ueberblick",
};

export const OVERVIEW_PATH_ALIASES = ["attekintes", "overview", "ueberblick"] as const;

export type LegalPageKey = "imprint" | "terms" | "privacy";

/** @deprecated Prefer legalSegment(lang, key). */
export const LEGAL_PATH: Record<"hu" | "en" | "de", Record<LegalPageKey, string>> = {
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

export function placePathAliases(): string[] {
  return aliasesForKey("place");
}

export function guidePathAliases(): string[] {
  return aliasesForKey("guide");
}

export function pricingPathAliases(): string[] {
  return aliasesForKey("pricing");
}

export function regionListPathAliases(): string[] {
  const list = aliasesForKey("regionList");
  if (!list.includes("teruletek")) list.push("teruletek");
  return list;
}

export function legalPathAliases(): string[] {
  return [
    ...aliasesForKey("legal.imprint"),
    ...aliasesForKey("legal.terms"),
    ...aliasesForKey("legal.privacy"),
  ];
}

export function overviewPathAliases(): string[] {
  return aliasesForKey("overview");
}

/** Localized legal path word for imprint / terms / privacy. */
export function legalSegment(lang: string, key: LegalPageKey): string {
  return pathSegment(lang, `legal.${key}`);
}

/** Map any legal alias segment back to the canonical page key. */
export function legalKeyFromSegment(segment: string | undefined): LegalPageKey | null {
  const key = pathSegmentKey(segment);
  if (key === "legal.imprint") return "imprint";
  if (key === "legal.terms") return "terms";
  if (key === "legal.privacy") return "privacy";
  return null;
}

/** Whether `pathname` contains a segment for the given legal page. */
export function pathnameHasLegal(pathname: string, key: LegalPageKey): boolean {
  return pathname.split("/").some((part) => legalKeyFromSegment(part) === key);
}

/** Localized region-list index segment. */
export function regionListSegment(lang: string): string {
  return pathSegment(lang, "regionList");
}

/** Localized sales-overview segment. */
export function overviewSegment(lang: string): string {
  return pathSegment(lang, "overview");
}

/**
 * Platform marketing landing path: language root only (`/hu`), no `/attekintes`.
 */
export function platformLandingPath(lang: string): string {
  const code = String(lang || "hu").split("-")[0];
  return `/${code}`;
}

/** True when the segment is any overview path alias. */
export function isOverviewPathSegment(segment: string | undefined): boolean {
  return isPathSegmentForKey(segment, "overview");
}

/** Localized place-detail path prefix. */
export function placeSegment(lang: string): string {
  return pathSegment(lang, "place");
}

/** Localized town path prefix. */
export function townSegment(lang: string): string {
  return pathSegment(lang, "town");
}

/** True when the segment is any place-detail path alias. */
export function isPlacePathSegment(segment: string | undefined): boolean {
  return isPathSegmentForKey(segment, "place");
}

/** True when the segment is any town path alias. */
export function isTownPathSegment(segment: string | undefined): boolean {
  return isPathSegmentForKey(segment, "town");
}

/** Localized list-view suffix under a town. */
export function listViewSegment(lang: string): string {
  return pathSegment(lang, "list");
}

/** Localized map-view word. */
export function mapViewSegment(lang: string): string {
  return pathSegment(lang, "map");
}

/** True when the segment is any list-view alias. */
export function isListViewSegment(segment: string | undefined): boolean {
  return isPathSegmentForKey(segment, "list");
}

/** True when the segment is any map-view alias. */
export function isMapViewSegment(segment: string | undefined): boolean {
  return isPathSegmentForKey(segment, "map");
}

/** True when the segment is a list or map view word. */
export function isExploreViewSegment(segment: string | undefined): boolean {
  return isListViewSegment(segment) || isMapViewSegment(segment);
}

/** A path word that is never a town slug (place, event, list, legal, …). */
export function isReservedPublicSegment(segment: string | undefined): boolean {
  return isReservedPathWord(segment);
}

/** Curator list slug from `/collections/:slug`, if the path has one. */
export function collectionSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("collections");
  if (index >= 0 && parts[index + 1]) return parts[index + 1];
  return null;
}

/** Place slug from place-segment/:slug, if the path has one. */
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
 */
export function townSlugFromPath(
  pathname: string,
  scope?: { kind?: string; siteSlug?: string; entitySlug?: string }
): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const body =
    parts[0] && /^[a-z]{2,3}$/.test(parts[0]) && !isReservedPublicSegment(parts[0])
      ? parts.slice(1)
      : [...parts];
  const hadView = isExploreViewSegment(body[body.length - 1]);
  if (hadView) body.pop();
  if (
    body.some(
      (part) =>
        isPlacePathSegment(part) || part === "event" || part === "collections" || part === "static-page"
    )
  ) {
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
  return isPathSegmentForKey(segment, "regionList") || segment === "teruletek";
}

/** Relative path under `/:lang/:siteKey/` for a place detail URL. */
export function placeEntityPath(lang: string, slug: string): string {
  return `${placeSegment(lang)}/${slug}`;
}

/**
 * Town directory is `etyek`. The map is `etyek/terkep` (map/karte).
 */
export function townEntityPath(lang: string, slug: string, view: "map" | "list" = "list"): string {
  if (view === "map") return `${slug}/${mapViewSegment(lang)}`;
  return slug;
}

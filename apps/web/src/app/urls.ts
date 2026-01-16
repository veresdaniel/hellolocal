// src/app/urls.ts
import { HAS_MULTIPLE_SITES } from "./config";
import type { Lang } from "./config";

type BuildArgs = {
  lang: Lang;
  siteKey?: string;
  path?: string; // pl. "place/xyz"
};

export function buildUrl({ lang, siteKey, path = "" }: BuildArgs) {
  const clean = path.replace(/^\//, "");
  const key = siteKey;
  if (HAS_MULTIPLE_SITES) {
    // If siteKey is not provided in multi-site mode, use lang-only URL
    // This is used for site list pages and other pages without site context
    if (!key) {
      return `/${lang}/${clean}`.replace(/\/$/, "");
    }
    return `/${lang}/${key}/${clean}`.replace(/\/$/, "");
  }
  return `/${lang}/${clean}`.replace(/\/$/, "");
}

/**
 * Builds a public URL for an entity based on its type and slug.
 *
 * @param args - URL building arguments
 * @param args.lang - Language code
 * @param args.siteKey - Site key (required in multi-site mode)
 * @param args.entityType - Entity type (place, event, town, page, etc.)
 * @param args.slug - Entity slug
 * @returns Public URL path (e.g., "/hu/etyek-budai/place/borostyan-pince")
 */
export function buildPublicUrl({
  lang,
  siteKey,
  entityType,
  slug,
}: {
  lang: string;
  siteKey?: string;
  entityType: "place" | "event" | "town" | "page" | "region" | "placeType";
  slug: string;
}): string {
  // Map entity types to URL paths
  const entityPathMap: Record<string, string> = {
    place: "place",
    event: "event",
    town: "town",
    page: "static-page", // Static pages use "static-page" in URL
    region: "teruletek", // Regions/sites use "teruletek" in URL
    placeType: "place-type", // Place types (if needed)
  };

  const entityPath = entityPathMap[entityType] || entityType;
  return buildUrl({
    lang: lang as Lang,
    siteKey: siteKey,
    path: `${entityPath}/${slug}`,
  });
}

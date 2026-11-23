// src/app/useRouteCtx.ts
import { useParams } from "react-router-dom";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES, type Lang, isLang } from "./config";
import { isReservedPublicSegment, mapViewSegment } from "./entityPaths";
import { useHostScope } from "./hostScope";

/**
 * Derive public `lang` + region `siteKey` from the URL and {@link useHostScope}.
 *
 * On a custom region/town/place/event host the region slug is not in the path —
 * the host supplies it. Town segments and map words on a region host are not treated as siteKeys.
 *
 * @returns `{ lang, siteKey, langParam, siteKeyParam }` — validated lang and resolved site slug
 */
export function useRouteCtx() {
  const { lang: langParam, siteKey: siteKeyParam } = useParams<{
    lang?: string;
    siteKey?: string;
  }>();
  const scope = useHostScope();

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const hostSlug =
    scope.status === "ready" && scope.kind !== "platform" && scope.kind !== "collection"
      ? scope.siteSlug
      : undefined;

  // On a region domain, /:lang/:town is the town. The param is not the region slug.
  const townOnRegionHost =
    scope.status === "ready" &&
    scope.kind === "site" &&
    !!siteKeyParam &&
    siteKeyParam !== scope.siteSlug &&
    !isReservedPublicSegment(siteKeyParam);
  const viewOnTownHost =
    scope.status === "ready" &&
    scope.kind === "town" &&
    siteKeyParam === mapViewSegment(lang);
  // Region domain: /:lang/terkep is the region map, not a site slug.
  const regionMap =
    scope.status === "ready" &&
    scope.kind === "site" &&
    siteKeyParam === mapViewSegment(lang);

  // On a custom host the region slug is not in the path; the host supplies it.
  const siteKey = HAS_MULTIPLE_SITES
    ? townOnRegionHost || viewOnTownHost || regionMap
      ? scope.siteSlug
      : (siteKeyParam ?? hostSlug ?? DEFAULT_SITE_SLUG)
    : DEFAULT_SITE_SLUG;

  return { lang, siteKey, langParam, siteKeyParam };
}

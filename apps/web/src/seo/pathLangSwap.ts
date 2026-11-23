import {
  isMapViewSegment,
  isOverviewPathSegment,
  isPlacePathSegment,
  isRegionListPathSegment,
  legalKeyFromSegment,
  legalSegment,
  MAP_VIEW_PATH,
  PLACE_PATH,
  platformLandingPath,
  regionListSegment,
} from "../app/entityPaths";
import type { Lang } from "../app/config";
import { isLang } from "../app/config";

/**
 * Rewrite a public pathname from one language to another (lang + localized segments).
 * Used by language switcher and automatic hreflang alternates — not admin-configurable.
 */
export function swapPublicPathLang(
  pathname: string,
  fromLang: string,
  toLang: Lang
): string {
  const current = isLang(fromLang) ? fromLang : "hu";
  const raw = pathname.split("?")[0] || "/";
  // Platform apex `/` and legacy overview segments → language-root landing.
  const segs = raw.split("/").filter(Boolean);
  if (
    segs.length === 0 ||
    (segs.length === 1 && isOverviewPathSegment(segs[0])) ||
    (segs.length === 2 && segs[0].toLowerCase() === current && isOverviewPathSegment(segs[1]))
  ) {
    return platformLandingPath(toLang);
  }
  // Only rewrite the leading /:lang segment — avoid replace() matching later path bits.
  const parts = raw.split("/");
  if (parts[1] && parts[1].toLowerCase() === current) {
    parts[1] = toLang;
  }
  return parts
    .flatMap((part) => {
      const key = legalKeyFromSegment(part);
      if (key) return [legalSegment(toLang, key)];
      if (isOverviewPathSegment(part)) return [];
      if (isMapViewSegment(part)) return [MAP_VIEW_PATH[toLang]];
      if (isPlacePathSegment(part)) return [PLACE_PATH[toLang]];
      if (isRegionListPathSegment(part)) return [regionListSegment(toLang)];
      if (part === "pricing" || part === "tarife" || part === "preise") {
        if (toLang === "en") return ["tarife"];
        if (toLang === "de") return ["preise"];
        return ["pricing"];
      }
      return [part];
    })
    .join("/");
}

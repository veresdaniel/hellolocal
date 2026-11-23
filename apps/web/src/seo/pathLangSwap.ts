import {
  isMapViewSegment,
  isOverviewPathSegment,
  isPlacePathSegment,
  isRegionListPathSegment,
  legalKeyFromSegment,
  legalSegment,
  MAP_VIEW_PATH,
  overviewSegment,
  PLACE_PATH,
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
  // Only rewrite the leading /:lang segment — avoid replace() matching later path bits.
  const parts = pathname.split("/");
  if (parts[1] && parts[1].toLowerCase() === current) {
    parts[1] = toLang;
  }
  return parts
    .flatMap((part) => {
      const key = legalKeyFromSegment(part);
      if (key) return [legalSegment(toLang, key)];
      if (isOverviewPathSegment(part)) return [overviewSegment(toLang)];
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

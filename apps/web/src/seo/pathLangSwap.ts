import {
  isMapViewSegment,
  isOverviewPathSegment,
  isPlacePathSegment,
  isRegionListPathSegment,
  legalKeyFromSegment,
  legalSegment,
  mapViewSegment,
  placeSegment,
  platformLandingPath,
  regionListSegment,
} from "../app/entityPaths";
import { isGuidePathSegment, guideSegment } from "../app/guidePaths";
import { pathSegment, pathSegmentKey } from "../app/pathSegmentsStore";
import type { Lang } from "../app/config";
import { isLang } from "../app/config";

/**
 * Rewrite a public pathname from one language to another (lang + localized segments).
 * Segments come from the path-segments store (UiPathSegment).
 */
export function swapPublicPathLang(
  pathname: string,
  fromLang: string,
  toLang: Lang
): string {
  const current = isLang(fromLang) ? fromLang : "hu";
  const raw = pathname.split("?")[0] || "/";
  const segs = raw.split("/").filter(Boolean);
  if (
    segs.length === 0 ||
    (segs.length === 1 && isOverviewPathSegment(segs[0])) ||
    (segs.length === 2 && segs[0].toLowerCase() === current && isOverviewPathSegment(segs[1]))
  ) {
    return platformLandingPath(toLang);
  }
  const parts = raw.split("/");
  if (parts[1] && parts[1].toLowerCase() === current) {
    parts[1] = toLang;
  }
  return parts
    .flatMap((part) => {
      const legalKey = legalKeyFromSegment(part);
      if (legalKey) return [legalSegment(toLang, legalKey)];
      if (isOverviewPathSegment(part)) return [];
      if (isMapViewSegment(part)) return [mapViewSegment(toLang)];
      if (isPlacePathSegment(part)) return [placeSegment(toLang)];
      if (isRegionListPathSegment(part)) return [regionListSegment(toLang)];
      if (isGuidePathSegment(part)) return [guideSegment(toLang)];
      if (pathSegmentKey(part) === "pricing") return [pathSegment(toLang, "pricing")];
      return [part];
    })
    .join("/");
}

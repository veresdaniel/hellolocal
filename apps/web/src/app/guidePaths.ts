import { aliasesForKey, pathSegment } from "./pathSegmentsStore";

/** Path folder for guides in `lang` (DB / dictionary: utmutato, guide, ratgeber, …). */
export function guideSegment(lang: string): string {
  return pathSegment(lang, "guide");
}

/** Public guide path: `/{lang}/{segment}/{slug}`. */
export function platformGuidePath(lang: string, slug: string): string {
  const code = String(lang || "hu").split("-")[0];
  return `/${code}/${guideSegment(code)}/${slug}`;
}

/** True when `segment` is a known guide folder. */
export function isGuidePathSegment(segment: string): boolean {
  return aliasesForKey("guide").includes(segment);
}

/** All known guide path aliases (for reserved lists / robots). */
export function guidePathAliases(): string[] {
  return aliasesForKey("guide");
}

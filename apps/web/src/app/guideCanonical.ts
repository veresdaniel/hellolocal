import { platformGuidePath } from "./guidePaths";

/**
 * Canonical URL for a platform guide on the current marketing host.
 * Stay on the request origin (.hu and .eu both serve every language).
 */
export function guideCanonical(origin: string, lang: string, slug: string): string {
  const base = String(origin || "").replace(/\/$/, "") || "https://hellolocal.hu";
  return `${base}${platformGuidePath(lang, slug)}`;
}

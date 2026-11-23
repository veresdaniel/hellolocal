/**
 * Normalize path/query siteKey for public API routes.
 * `"default"` and empty values mean "implicit / default site" (same as omitting siteKey).
 */
export function normalizePublicSiteKey(siteKey?: string | null): string | undefined {
  const key = typeof siteKey === "string" ? siteKey.trim() : "";
  if (!key || key === "default") return undefined;
  return key;
}

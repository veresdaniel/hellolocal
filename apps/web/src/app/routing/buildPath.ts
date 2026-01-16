// src/app/routing/buildPath.ts
import { buildUrl } from "../urls";
import type { Lang } from "../config";

/**
 * Builds a path with optional site slug based on multi-site configuration
 * Note: This function doesn't check site count - it's handled by SiteLayout
 * If you need to check site count, use the useActiveSitesCount hook
 *
 * The path format should be: /{lang}/{siteSlug?}/{path}
 * SiteLayout will handle redirecting if site slug shouldn't be shown
 *
 * @deprecated Use buildUrl from urls.ts instead. This function is kept for backward compatibility.
 */
export function buildPath(opts: {
  siteSlug: string;
  tenantSlug?: string;
  lang: Lang;
  path?: string;
}) {
  return buildUrl({ lang: opts.lang, siteKey: opts.siteSlug || opts.tenantSlug, path: opts.path });
}

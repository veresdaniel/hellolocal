import { apiGetPublic } from "./client";

export type ResolveResponse = {
  siteId: string;
  lang: "hu" | "en" | "de";
  entityType: "place" | "event" | "town" | "page" | "region" | "placeType";
  entityId: string;
  canonical: {
    lang: "hu" | "en" | "de";
    siteKey: string;
    slug: string;
  };
  needsRedirect: boolean;
};

/**
 * Resolves a slug to its entity information.
 * Returns entityType, entityId, canonical URL information, and whether a redirect is needed.
 *
 * This is the stable resolver endpoint that handles:
 * - SiteKey resolution (with redirects)
 * - Slug resolution (with redirects and primary slug lookup)
 *
 * @param params - Resolution parameters
 * @param params.lang - Language code (hu, en, de)
 * @param params.siteKey - Site key from URL
 * @param params.slug - Slug from URL
 * @returns Resolved entity information with canonical URL
 */
export async function resolveSlug(params: {
  lang: string;
  siteKey: string;
  slug: string;
}): Promise<ResolveResponse> {
  const { lang, siteKey, slug } = params;
  return apiGetPublic<ResolveResponse>(
    `/public/${lang}/${siteKey}/resolve/${encodeURIComponent(slug)}`
  );
}

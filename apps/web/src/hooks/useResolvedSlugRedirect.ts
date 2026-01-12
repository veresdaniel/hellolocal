import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { resolveSlug } from "../api/resolve.api";
import { buildPublicUrl } from "../app/urls";

type Args = {
  lang: string;
  siteKey: string;
  slug: string;
};

/**
 * Hook that resolves a slug and handles redirects to canonical URLs.
 * 
 * Flow:
 * 1. Resolve slug to get entity information
 * 2. If redirect needed → navigate to canonical URL with replace
 * 3. Returns query object with resolved data
 */
export function useResolvedSlugRedirect({ lang, siteKey, slug }: Args) {
  const enabled = Boolean(lang && siteKey && slug);

  const q = useQuery({
    queryKey: ["resolve", lang, siteKey, slug],
    queryFn: () => resolveSlug({ lang, siteKey, slug }),
    enabled,
    staleTime: 60_000,
    retry: (count, err: any) => {
      // 404-nél ne retry-oljon feleslegesen
      if (err?.status === 404) return false;
      return count < 2;
    },
  });

  const navigate = useNavigate();
  const location = useLocation();

  const canonicalPath = useMemo(() => {
    if (!q.data) return null;
    // Use canonical siteKey and slug from the response
    return buildPublicUrl({
      lang: q.data.canonical.lang,
      siteKey: q.data.canonical.siteKey,
      entityType: q.data.entityType,
      slug: q.data.canonical.slug,
    });
  }, [q.data]);

  useEffect(() => {
    if (!q.data) return;
    if (!q.data.needsRedirect) return;
    if (!canonicalPath) return;

    const target = `${canonicalPath}${location.search}${location.hash}`;

    // loop elleni védelem
    if (target === `${location.pathname}${location.search}${location.hash}`) return;

    navigate(target, { replace: true });
  }, [q.data, canonicalPath, navigate, location.pathname, location.search, location.hash]);

  return q;
}

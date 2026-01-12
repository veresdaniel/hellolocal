// src/components/StaticPagesRouteGuard.tsx
import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "../app/site/useSiteContext";
import { getStaticPages } from "../api/static-pages.api";
import { HAS_MULTIPLE_SITES } from "../app/config";
import { StaticPagesListPage } from "../pages/StaticPagesListPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LoadingSpinner } from "./LoadingSpinner";

export function StaticPagesRouteGuard() {
  const { lang, siteKey } = useSiteContext();
  const effectiveSiteKey = HAS_MULTIPLE_SITES ? siteKey : undefined;

  // Check if there are any static pages
  const { data: staticPages = [], isLoading } = useQuery({
    queryKey: ["staticPages", lang, effectiveSiteKey, "all"],
    queryFn: () => getStaticPages(lang, effectiveSiteKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Show loading while checking
  if (isLoading) {
    return <LoadingSpinner isLoading={true} />;
  }

  // If no static pages exist, show 404
  if (staticPages.length === 0) {
    return <NotFoundPage />;
  }

  // If static pages exist, render the list page
  return <StaticPagesListPage />;
}

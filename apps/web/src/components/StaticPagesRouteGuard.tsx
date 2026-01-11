// src/components/StaticPagesRouteGuard.tsx
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getStaticPages } from "../api/static-pages.api";
import { HAS_MULTIPLE_TENANTS } from "../app/config";
import { StaticPagesListPage } from "../pages/StaticPagesListPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LoadingSpinner } from "./LoadingSpinner";

export function StaticPagesRouteGuard() {
  const { lang, tenantSlug } = useTenantContext();
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  // Check if there are any static pages
  const { data: staticPages = [], isLoading } = useQuery({
    queryKey: ["staticPages", lang, tenantKey, "all"],
    queryFn: () => getStaticPages(lang, tenantKey),
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

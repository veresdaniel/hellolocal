// src/components/RootRedirect.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicDefaultLanguage } from "../api/public.api";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG, DEFAULT_LANG } from "../app/config";
import { LoadingSpinner } from "./LoadingSpinner";
import { useActiveTenantsCount } from "../hooks/useActiveTenantsCount";
import type { Lang } from "../app/config";

export function RootRedirect() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  
  // Fetch default language from app settings
  const { data: defaultLang, isLoading: isLoadingLang } = useQuery({
    queryKey: ["publicDefaultLanguage"],
    queryFn: async () => {
      try {
        const result = await getPublicDefaultLanguage();
        return result.defaultLanguage as Lang;
      } catch {
        return DEFAULT_LANG;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Fetch active tenants count to determine if tenant slug should be shown
  const { data: tenantsCountData, isLoading: isLoadingTenantsCount } = useActiveTenantsCount();

  // Show loading spinner while fetching default language and tenants count
  if (isLoadingLang || !defaultLang || isLoadingTenantsCount) {
    return <LoadingSpinner isLoading={true} delay={0} />;
  }

  // If this is an admin route, redirect to language-specific admin route
  if (isAdminRoute) {
    const adminPath = location.pathname.replace("/admin", "");
    return <Navigate to={`/${defaultLang}/admin${adminPath}`} replace />;
  }

  // Determine if we should show tenant slug in URL
  // If multi-tenant is enabled but only one tenant exists, hide tenant slug from URL
  const shouldShowTenantSlug = HAS_MULTIPLE_TENANTS && (tenantsCountData?.count ?? 0) > 1;

  // Redirect to default language (with or without tenant slug based on tenant count)
  const path = shouldShowTenantSlug
    ? `/${defaultLang}/${DEFAULT_TENANT_SLUG}`
    : `/${defaultLang}`;
  
  return <Navigate to={path} replace />;
}


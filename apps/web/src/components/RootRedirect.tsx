// src/components/RootRedirect.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicDefaultLanguage } from "../api/public.api";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, DEFAULT_LANG } from "../app/config";
import { LoadingSpinner } from "./LoadingSpinner";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";
import type { Lang } from "../app/config";

export function RootRedirect() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  
  // For admin routes without language code, redirect immediately to default language
  // This handles /admin, /admin/login, /admin/register, etc.
  if (isAdminRoute) {
    // Extract the path after /admin (e.g., "/login" from "/admin/login", or "" from "/admin")
    // Handle both "/admin" and "/admin/login" cases
    let adminPath = location.pathname.replace(/^\/admin/, "") || "";
    
    // Ensure adminPath starts with / if it's not empty
    if (adminPath && !adminPath.startsWith("/")) {
      adminPath = `/${adminPath}`;
    }
    
    // Use DEFAULT_LANG immediately for admin routes (no API call needed)
    const finalPath = `/${DEFAULT_LANG}/admin${adminPath}`;
    
    return <Navigate to={finalPath} replace />;
  }
  
  // Fetch default language from app settings (only for public routes)
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

  // Fetch active sites count to determine if site slug should be shown
  const { data: sitesCountData, isLoading: isLoadingSitesCount } = useActiveSitesCount();

  // Use default language (from API or fallback to DEFAULT_LANG)
  const lang = defaultLang || DEFAULT_LANG;

  // Show loading spinner while fetching default language and sites count (only for public routes)
  if (isLoadingLang || isLoadingSitesCount) {
    return <LoadingSpinner isLoading={true} delay={0} />;
  }

  // Determine if we should show site slug in URL
  // If multi-site is enabled but only one site exists, hide site slug from URL
  // Fallback to false if sitesCountData is not available
  const shouldShowSiteSlug = HAS_MULTIPLE_SITES && (sitesCountData?.count ?? 0) > 1;

  // Redirect to default language (with or without site slug based on site count)
  const path = shouldShowSiteSlug
    ? `/${defaultLang}/${DEFAULT_SITE_SLUG}`
    : `/${defaultLang}`;
  
  return <Navigate to={path} replace />;
}


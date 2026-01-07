// src/components/RootRedirect.tsx
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicDefaultLanguage } from "../api/public.api";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG, DEFAULT_LANG } from "../app/config";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Lang } from "../app/config";

export function RootRedirect() {
  // Fetch default language from app settings
  const { data: defaultLang, isLoading } = useQuery({
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

  // Show loading spinner while fetching default language
  if (isLoading || !defaultLang) {
    return <LoadingSpinner isLoading={true} delay={0} />;
  }

  // Redirect to default language
  const path = HAS_MULTIPLE_TENANTS
    ? `/${defaultLang}/${DEFAULT_TENANT_SLUG}`
    : `/${defaultLang}`;
  
  return <Navigate to={path} replace />;
}


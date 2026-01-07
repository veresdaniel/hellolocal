// src/hooks/usePublicDefaultLanguage.ts
import { useQuery } from "@tanstack/react-query";
import { getPublicDefaultLanguage } from "../api/public.api";
import { DEFAULT_LANG } from "../app/config";
import type { Lang } from "../app/config";

/**
 * Hook to get the default language from app settings for public interface
 * This should be used in TenantLayout or similar public components
 * Uses public API endpoint that doesn't require authentication
 */
export function usePublicDefaultLanguage(): Lang {
  const { data } = useQuery({
    queryKey: ["publicDefaultLanguage"],
    queryFn: async () => {
      try {
        const result = await getPublicDefaultLanguage();
        return result.defaultLanguage;
      } catch {
        // If API call fails, use fallback
        return DEFAULT_LANG;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Retry once if it fails
  });

  return data || DEFAULT_LANG;
}


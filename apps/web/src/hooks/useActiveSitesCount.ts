// src/hooks/useActiveSitesCount.ts
import { useQuery } from "@tanstack/react-query";
import { getActiveSitesCount } from "../api/public.api";

/**
 * Hook to get the number of active sites
 * Used to determine if site slug should be shown in URLs
 */
export function useActiveSitesCount() {
  return useQuery({
    queryKey: ["activeSitesCount"],
    queryFn: getActiveSitesCount,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}


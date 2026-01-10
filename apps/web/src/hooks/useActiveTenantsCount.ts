// src/hooks/useActiveTenantsCount.ts
import { useQuery } from "@tanstack/react-query";
import { getActiveTenantsCount } from "../api/public.api";

/**
 * Hook to get the number of active tenants
 * Used to determine if tenant slug should be shown in URLs
 */
export function useActiveTenantsCount() {
  return useQuery({
    queryKey: ["activeTenantsCount"],
    queryFn: getActiveTenantsCount,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

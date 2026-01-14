// src/app/site/usePlatformSettings.ts
import { useQuery } from "@tanstack/react-query";
import type { Lang } from "../config";
import type { PlatformSettings } from "./SiteOutletContext";
import { apiGetPublic } from "../api/client";

type Args = { lang: Lang; siteKey: string; tenantKey?: string }; // Support both for backward compatibility

async function fetchPlatformSettings({ lang, siteKey, tenantKey }: Args): Promise<PlatformSettings> {
  // Backend expects path parameters: /api/public/:lang/:siteKey/platform
  const key = siteKey || tenantKey || "";
  // Use apiGetPublic to ensure correct API base URL in production
  return apiGetPublic<PlatformSettings>(`/public/${lang}/${key}/platform`);
}

export function usePlatformSettings(args: Args) {
  const key = args.siteKey || args.tenantKey || "";
  return useQuery({
    queryKey: ["platformSettings", args.lang, key],
    queryFn: () => fetchPlatformSettings({ ...args, siteKey: key }),
    staleTime: 60_000,
    retry: 1,
  });
}

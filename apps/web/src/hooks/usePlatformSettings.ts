// src/hooks/usePlatformSettings.ts
import { useQuery } from "@tanstack/react-query";
import type { Lang, PlatformSettingsDto } from "../types/platformSettings";
import { fetchPlatformSettings } from "../api/platformSettings";

export function usePlatformSettings(lang: Lang, siteKey: string) {
  return useQuery<PlatformSettingsDto>({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => fetchPlatformSettings({ lang, siteKey }),
    enabled: !!lang && !!siteKey,
    staleTime: 5 * 60 * 1000,
  });
}

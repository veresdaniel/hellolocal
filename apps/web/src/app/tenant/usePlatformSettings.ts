// src/app/tenant/usePlatformSettings.ts
import { useQuery } from "@tanstack/react-query";
import type { Lang } from "../config";
import type { PlatformSettings } from "./TenantOutletContext";

type Args = { lang: Lang; siteKey: string; tenantKey?: string }; // Support both for backward compatibility

async function fetchPlatformSettings({ lang, siteKey, tenantKey }: Args): Promise<PlatformSettings> {
  // Backend expects path parameters: /api/public/:lang/:siteKey/platform
  const key = siteKey || tenantKey || "";
  const url = `/api/public/${lang}/${key}/platform`;

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to load platform settings (${res.status})`);
  }
  return res.json();
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

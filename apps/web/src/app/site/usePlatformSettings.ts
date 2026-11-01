// src/app/site/usePlatformSettings.ts
import { useQuery } from "@tanstack/react-query";
import type { Lang } from "../config";
import type { PlatformSettings } from "./SiteOutletContext";
import { getPlatformSettings } from "../../api/places.api";

type Args = { lang: Lang; siteKey: string; tenantKey?: string }; // Support both for backward compatibility

export function usePlatformSettings(args: Args) {
  const key = args.siteKey || args.tenantKey || "";
  return useQuery({
    // Same key + same mapper as pages using getPlatformSettings — avoids cache shape mismatch
    queryKey: ["platformSettings", args.lang, key],
    queryFn: ({ signal }) =>
      getPlatformSettings(args.lang, key, { signal }) as Promise<PlatformSettings>,
    staleTime: 60_000,
    retry: 1,
  });
}

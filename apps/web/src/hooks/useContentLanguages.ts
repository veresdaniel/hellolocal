import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getPlatformSettings } from "../api/places.api";
import { getPublicUiLanguages } from "../api/uiCopy.api";
import { useRouteCtx } from "../app/useRouteCtx";
import { useAdminSite } from "../contexts/useAdminSite";
import { LANG_VALUES, isLang } from "../types/enums";

function published(codes: readonly string[] | undefined): string[] {
  const list = (codes ?? []).map((code) => code.toLowerCase()).filter(isLang);
  return list.length ? list : [...LANG_VALUES];
}

/** Languages the selected admin site publishes. */
export function useContentLanguages(): string[] {
  const { sites, selectedSiteId } = useAdminSite();
  const site = sites.find((item) => item.id === selectedSiteId);
  return published(site?.languages);
}

/** Languages offered in the public header. The admin chrome stays on hu/en/de. */
export function usePublishedLanguages(): string[] {
  const location = useLocation();
  const { lang, siteKey } = useRouteCtx();
  const isAdmin = location.pathname.includes("/admin");
  const { data } = useQuery({
    queryKey: ["platformSettings", lang, siteKey || "default", "languages"],
    queryFn: () => getPlatformSettings(lang, siteKey),
    enabled: !isAdmin && !!siteKey,
    staleTime: 60_000,
    retry: 1,
  });
  const uiLanguages = useQuery({
    queryKey: ["ui-languages"],
    queryFn: getPublicUiLanguages,
    enabled: !isAdmin,
    staleTime: 60_000,
    retry: 1,
  });
  if (isAdmin) return [...LANG_VALUES];
  const interfaceLanguages = (uiLanguages.data?.languages ?? []).filter(isLang);
  const base = interfaceLanguages.length ? interfaceLanguages : [...LANG_VALUES];
  if (!siteKey) return base;
  return [...new Set([...base, ...published(data?.languages)])];
}

import { useMemo } from "react";
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
  return useMemo(() => published(site?.languages), [site?.languages]);
}

/** Languages offered in the header switcher: DB UI languages (admin copy is translated too); site languages added on public pages. */
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
    staleTime: 60_000,
    retry: 1,
  });
  return useMemo(() => {
    const interfaceLanguages = (uiLanguages.data?.languages ?? []).filter(isLang);
    const base = interfaceLanguages.length ? interfaceLanguages : [...LANG_VALUES];
    if (isAdmin || !siteKey) return base;
    return [...new Set([...base, ...published(data?.languages)])];
  }, [isAdmin, uiLanguages.data?.languages, siteKey, data?.languages]);
}

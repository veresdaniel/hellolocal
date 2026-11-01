import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../api/places.api";
import type { Lang } from "../app/config";
import { landingOverride, landingString, fillCount } from "../components/landingCopy";
import { hasUiCopy } from "../i18n/loadUiCopy";

export function useLandingText(lang: Lang) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["platformSettings", lang, "default", "plans"],
    queryFn: () => getPlatformSettings(lang),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const override = landingOverride(data?.featureMatrix?.planOverrides, lang);

  return useCallback(
    (path: string, options?: { count?: string | number }) => {
      const translated = String(t(`public.overview.${path}`));
      if (hasUiCopy(lang)) return fillCount(translated, options?.count);
      return landingString(override, path, translated, options?.count);
    },
    [override, t, lang]
  );
}

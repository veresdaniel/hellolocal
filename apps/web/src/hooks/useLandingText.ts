/**
 * Platform overview copy helper: prefers DB UI copy, else admin planOverrides landing strings.
 * Returns `(path, { count? }) => string` for CSR landing sections.
 */
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformSettings } from "../api/places.api";
import type { Lang } from "../app/config";
import {
  landingOverride,
  landingString,
  landingDefault,
  fillCountWithFallback,
} from "../components/landingCopy";
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
      const bundled = landingDefault(lang, path);
      // DB UI copy can lag behind locale JSON; if it dropped `{{count}}`, use the bundle.
      if (hasUiCopy(lang)) {
        return options?.count !== undefined
          ? fillCountWithFallback(translated, bundled || translated, options.count)
          : translated;
      }
      return landingString(override, path, translated, options?.count);
    },
    [override, t, lang]
  );
}

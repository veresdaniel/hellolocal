/**
 * Platform overview copy: UiMessage (DB) is the live source once seeded.
 * Locale JSON (`public.json` overview) is seed + cold fallback only.
 *
 * Precedence (CSR):
 * 1. i18n bundle = JSON deep-merged with public UiMessage rows
 * 2. `{{count}}` repaired via bundled template if DB dropped the placeholder
 *
 * Do not read `planOverrides.landingCopy` — that path is retired; edit via
 * Admin → i18n (overview) or Public plans editor (plan cards → UiMessage).
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Lang } from "../app/config";
import { landingDefault, fillCountWithFallback } from "../components/landingCopy";

export function useLandingText(lang: Lang) {
  const { t } = useTranslation();

  return useCallback(
    (path: string, options?: { count?: string | number }) => {
      const translated = String(t(`public.overview.${path}`, { defaultValue: "" }));
      const bundled = landingDefault(lang, path);
      const primary = translated.trim() || bundled;
      if (options?.count === undefined) return primary;
      return fillCountWithFallback(primary, bundled || primary, options.count);
    },
    [t, lang]
  );
}

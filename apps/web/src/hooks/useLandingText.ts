/**
 * Platform overview copy helper: prefers DB UI copy, else admin planOverrides landing strings.
 * Returns `(path, { count? }) => string` for CSR landing sections.
 *
 * Plan-card strings often lag in UiMessage after locale JSON updates (e.g. old
 * "Látszódj"). For `plans.*` paths we fall back to the bundled JSON when the DB
 * value is a known superseded default.
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

/** Superseded plan-card defaults that may still sit in UiMessage. */
const STALE_PLAN_COPY = new Set([
  "Látszódj",
  "Be seen",
  "Werde sichtbar",
  "Minden helyeden",
  "Every location",
  "An jedem Ort",
  "Egy műhely, pince vagy szolgáltatás. {{count}} nap próba; utána szüneteltetés, amíg nem váltasz csomagot. Saját domain a következő csomagtól.",
  "One workshop, cellar, or service. {{count}}-day trial; then suspended until you upgrade. Your own domain starts with the next plan.",
  "Eine Werkstatt, ein Keller oder ein Dienst. {{count}} Tage Testphase; danach Pause, bis du upgradest. Die eigene Domain gibt es ab dem nächsten Paket.",
  "Néhány telephely, egy vállalkozás. A saját domaineteken.",
  "A few locations under one business. On your own domain.",
  "Ein paar Standorte, ein Betrieb. Auf der eigenen Domain.",
  "Tedd fel a műhelyed, pincéd vagy szolgáltatásod a térképre. {{count}} nap próba; utána szünet, amíg nem választasz csomagot. Saját domain a következő csomagtól.",
  "Put your workshop, cellar or service on the map. {{count}}-day trial; then pause until you pick a plan. Your own domain starts with the next plan.",
  "Setze Werkstatt, Keller oder Dienst auf die Karte. {{count}} Tage Testphase; danach Pause, bis du ein Paket wählst. Die eigene Domain gibt es ab dem nächsten Paket.",
  "Néhány telephely egy vállalkozás alatt — a saját domaineden, a programjaiddal együtt. Ideális, ha már több helyet is mutatnál.",
  "A few locations under one business — on your own domain, with your events. Ideal when you already have more than one place to show.",
  "Ein paar Standorte unter einem Betrieb — auf der eigenen Domain, mit euren Terminen. Ideal, wenn ihr schon mehr als einen Ort zeigen wollt.",
  "A nyelvek az ajánlat részei",
  "Languages are part of the offer",
  "Languages are part of the quote",
  "Die Sprachen sind Teil des Angebots",
]);

function resolvePlanCopy(path: string, translated: string, bundled: string): string {
  if (!path.startsWith("plans.")) return translated;
  const trimmed = translated.trim();
  if (!trimmed || trimmed === `public.overview.${path}`) return bundled || translated;
  if (bundled && STALE_PLAN_COPY.has(trimmed)) return bundled;
  return translated;
}

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
      const primary = resolvePlanCopy(path, translated, bundled || translated);
      // DB UI copy can lag behind locale JSON; if it dropped `{{count}}`, use the bundle.
      if (hasUiCopy(lang)) {
        return options?.count !== undefined
          ? fillCountWithFallback(primary, bundled || primary, options.count)
          : primary;
      }
      return landingString(override, path, primary, options?.count);
    },
    [override, t, lang]
  );
}

/**
 * Bundled overview fallbacks + {{count}} helpers.
 * Live copy is UiMessage (DB) via i18n; this module only supplies cold JSON
 * defaults that survive `addResourceBundle` deep-merge mutation.
 */
import huPublic from "../i18n/locales/hu/public.json";
import enPublic from "../i18n/locales/en/public.json";
import dePublic from "../i18n/locales/de/public.json";
import { isUiLang, type Lang, type UiLang } from "../types/enums";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stringAt(source: unknown, path: string): string {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return typeof current === "string" ? current : "";
}

// Clone: i18n `addResourceBundle(..., deep)` mutates the shared JSON module in
// place when DB UI copy loads — landingDefault must keep the bundled strings.
const DEFAULTS: Record<UiLang, unknown> = {
  hu: structuredClone(huPublic.overview),
  en: structuredClone(enPublic.overview),
  de: structuredClone(dePublic.overview),
};

export function landingDefault(lang: Lang, path: string): string {
  const ui: UiLang = isUiLang(lang) ? lang : "en";
  return stringAt(DEFAULTS[ui], path) || stringAt(DEFAULTS.hu, path);
}

export function fillCount(template: string, count?: string | number): string {
  if (count === undefined) return template;
  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

function hasCountPlaceholder(template: string): boolean {
  return /\{\{\s*count\s*\}\}/.test(template);
}

/**
 * When DB UI copy still has a stale string without `{{count}}`,
 * prefer the bundled fallback that keeps the placeholder.
 */
export function fillCountWithFallback(
  primary: string,
  fallback: string,
  count?: string | number
): string {
  if (count === undefined) return primary || fallback;
  const template = hasCountPlaceholder(primary)
    ? primary
    : hasCountPlaceholder(fallback)
      ? fallback
      : primary || fallback;
  return fillCount(template, count);
}

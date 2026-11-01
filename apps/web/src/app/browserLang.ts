import { DEFAULT_LANG } from "./config";
import { isLang, type Lang } from "../types/enums";
import catalog from "../i18n/languages.json";

export const I18N_STORAGE_KEY = "i18nextLng";

const ZONE_TO_LANG = new Map<string, Lang>();
for (const language of catalog.languages) {
  if (!isLang(language.code)) continue;
  for (const zone of language.timeZones) {
    ZONE_TO_LANG.set(zone, language.code);
  }
}

const INTERNATIONAL: Lang = isLang(catalog.international) ? catalog.international : DEFAULT_LANG;

export function normalizeLang(value: string | null | undefined): Lang | null {
  if (!value) return null;
  const base = value.toLowerCase().split("-")[0];
  return isLang(base) ? base : null;
}

/**
 * A listed time zone picks that language.
 * Anywhere else, the browser language list decides, then the catalog's international language.
 */
export function langFromLocation(
  timeZone: string,
  languages: readonly string[],
  fallback: Lang = DEFAULT_LANG,
): Lang {
  const fromZone = ZONE_TO_LANG.get(timeZone);
  if (fromZone) return fromZone;
  for (const entry of languages) {
    const match = normalizeLang(entry);
    if (match) return match;
  }
  if (languages.some((entry) => entry.trim())) return INTERNATIONAL;
  return fallback;
}

export function browserDefaultLang(fallback: Lang = DEFAULT_LANG): Lang {
  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timeZone = "";
  }
  const languages =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : [];
  return langFromLocation(timeZone, languages, fallback);
}

const LANG_PATH = /^\/([a-z]{2,3})(?:\/|$)/;

export function langFromPathname(pathname: string): Lang | null {
  return normalizeLang(pathname.match(LANG_PATH)?.[1]);
}

/** URL language, then an explicit saved choice, then the browser location. */
export function preferredLang(): Lang {
  if (typeof window === "undefined") return browserDefaultLang();
  const fromPath = langFromPathname(window.location.pathname);
  if (fromPath) return fromPath;
  try {
    const stored = normalizeLang(window.localStorage.getItem(I18N_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    /* private mode can block storage */
  }
  return browserDefaultLang();
}

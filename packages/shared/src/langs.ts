/** Interface languages that ship with translated UI strings. */
export const LANG_VALUES = ["hu", "en", "de"] as const;
export type UiLang = (typeof LANG_VALUES)[number];

/** A published content language — any ISO 639-1 / 639-2 code, not only UI langs. */
export type Lang = string;

/** Kept so existing `Lang.hu` call sites stay valid after the DB enum was removed. */
export const LangEnum = {
  hu: "hu",
  en: "en",
  de: "de",
} as const;

export const FALLBACK_LANG: UiLang = "hu";

const CODE = /^[a-z]{2,3}$/;

/** Path segments that must not be treated as a language. */
const RESERVED = new Set(["api", "assets", "static", "src", "www", "app", "css", "img"]);

export function isLanguageCode(value: string | null | undefined): value is string {
  return !!value && CODE.test(value) && !RESERVED.has(value);
}

export function isUiLang(value: string | null | undefined): value is UiLang {
  return !!value && (LANG_VALUES as readonly string[]).includes(value);
}

export function normalizeLanguageCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const base = value.trim().toLowerCase().split("-")[0];
  return isLanguageCode(base) ? base : null;
}

/** Dedupe, lowercase, and drop invalid codes. Order is kept. */
export function normalizeLanguageList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const code = normalizeLanguageCode(value);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

export function languageLabel(code: string, uiLang = "en"): string {
  try {
    const names = new Intl.DisplayNames([uiLang, "en"], { type: "language" });
    const label = names.of(code);
    if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    /* Intl can reject an unknown locale list */
  }
  return code.toUpperCase();
}

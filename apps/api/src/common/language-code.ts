/** Re-export shared language helpers — single source in `@hellolocal/shared`. */
export {
  LANG_VALUES as UI_LANGS,
  FALLBACK_LANG,
  LangEnum as Lang,
  isLanguageCode,
  isUiLang,
  languageLabel,
  normalizeLanguageCode,
  normalizeLanguageList,
  type UiLang,
} from "@hellolocal/shared";

/** ISO 639-1 / 639-2 language code. Content can use any of these, not a fixed list. */
export type Lang = string;

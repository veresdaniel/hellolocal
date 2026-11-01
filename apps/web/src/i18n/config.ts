// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANG, LANG_VALUES } from "../app/config";
import { I18N_STORAGE_KEY, normalizeLang, preferredLang} from "../app/browserLang";
import catalog from "./languages.json";

const catalogCodes = catalog.languages.map((language) => language.code);
if (
  catalog.fallback !== DEFAULT_LANG ||
  catalogCodes.length !== LANG_VALUES.length ||
  LANG_VALUES.some((code, index) => catalogCodes[index] !== code)
) {
  throw new Error("src/i18n/languages.json must list the same codes, in the same order, as LANG_VALUES");
}

type LocaleModule = Record<string, unknown>;
const localeModules = import.meta.glob("./locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, LocaleModule>;

const resources: Record<string, { translation: Record<string, LocaleModule> }> = {};
for (const [path, data] of Object.entries(localeModules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, namespace] = match;
  resources[lang] ??= { translation: {} };
  resources[lang].translation[namespace] = data;
}

i18n
  .use({
    type: "languageDetector",
    async: false,
    detect: () => preferredLang(),
    init: () => undefined,
    cacheUserLanguage: (lng: string) => {
      const normalized = normalizeLang(lng);
      if (!normalized) return;
      try {
        window.localStorage.setItem(I18N_STORAGE_KEY, normalized);
      } catch {
        /* ignore */
      }
    },
  })
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ["en", DEFAULT_LANG],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

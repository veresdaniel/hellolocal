// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import split translation files
import huCommon from "./locales/hu/common.json";
import huPublic from "./locales/hu/public.json";
import huAdmin from "./locales/hu/admin.json";
import huValidation from "./locales/hu/validation.json";
import huError from "./locales/hu/error.json";
import huOffline from "./locales/hu/offline.json";
import huCookieConsent from "./locales/hu/cookieConsent.json";

import enCommon from "./locales/en/common.json";
import enPublic from "./locales/en/public.json";
import enAdmin from "./locales/en/admin.json";
import enValidation from "./locales/en/validation.json";
import enError from "./locales/en/error.json";
import enOffline from "./locales/en/offline.json";
import enCookieConsent from "./locales/en/cookieConsent.json";

import deCommon from "./locales/de/common.json";
import dePublic from "./locales/de/public.json";
import deAdmin from "./locales/de/admin.json";
import deValidation from "./locales/de/validation.json";
import deError from "./locales/de/error.json";
import deOffline from "./locales/de/offline.json";
import deCookieConsent from "./locales/de/cookieConsent.json";

// Merge all translation files for each language
const hu = {
  common: huCommon,
  public: huPublic,
  admin: huAdmin,
  validation: huValidation,
  error: huError,
  offline: huOffline,
  cookieConsent: huCookieConsent,
};

const en = {
  common: enCommon,
  public: enPublic,
  admin: enAdmin,
  validation: enValidation,
  error: enError,
  offline: enOffline,
  cookieConsent: enCookieConsent,
};

const de = {
  common: deCommon,
  public: dePublic,
  admin: deAdmin,
  validation: deValidation,
  error: deError,
  offline: deOffline,
  cookieConsent: deCookieConsent,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      hu: { translation: hu },
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: "hu",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["path", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
      lookupFromPathIndex: 0, // First segment in path is language
    },
  });

export default i18n;

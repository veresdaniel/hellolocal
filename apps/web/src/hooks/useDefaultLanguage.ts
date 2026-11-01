// src/hooks/useDefaultLanguage.ts
import { useEffect } from "react";
import i18n from "../i18n/config";
import { browserDefaultLang, I18N_STORAGE_KEY, normalizeLang } from "../app/browserLang";

function syncDocumentLang(lng: string) {
  const code = (normalizeLang(lng) ?? lng.split("-")[0] ?? "hu").toLowerCase();
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
  }
}

/**
 * Keeps a saved language choice. When nothing valid is stored yet,
 * the browser time zone and language list pick hu, en, or de.
 * Also keeps <html lang> in sync for assistive tech.
 */
export function useDefaultLanguage() {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(I18N_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const normalized = normalizeLang(stored);
    const lang = normalized ?? browserDefaultLang();
    if (stored !== lang) {
      try {
        localStorage.setItem(I18N_STORAGE_KEY, lang);
      } catch {
        /* ignore */
      }
    }
    syncDocumentLang(i18n.language || lang);
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }

    const onLanguageChanged = (lng: string) => {
      syncDocumentLang(lng);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  return { isLoading: false };
}

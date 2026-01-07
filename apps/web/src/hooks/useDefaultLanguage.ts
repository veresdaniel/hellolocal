// src/hooks/useDefaultLanguage.ts
import { useEffect, useState } from "react";
import { getDefaultLanguage } from "../api/admin.api";
import i18n from "../i18n/config";

/**
 * Hook to load and apply the default language from app settings
 * This should be called once on app initialization
 */
export function useDefaultLanguage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDefaultLanguage = async () => {
      try {
        // Try to get default language from API
        const data = await getDefaultLanguage();
        const defaultLang = data.defaultLanguage;

        // Only set default language if no language is stored in localStorage
        // This allows users to override the default with their preference
        const storedLang = localStorage.getItem("i18nextLng");
        if (!storedLang) {
          i18n.changeLanguage(defaultLang);
          localStorage.setItem("i18nextLng", defaultLang);
        }
      } catch (err) {
        // If API call fails (e.g., not authenticated), use fallback
        // This is fine for public pages - they will use usePublicDefaultLanguage hook
        console.warn("Failed to load default language from API, using fallback", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultLanguage();
  }, []);

  return { isLoading };
}


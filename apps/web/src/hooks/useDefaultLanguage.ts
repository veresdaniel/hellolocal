// src/hooks/useDefaultLanguage.ts
import { useEffect, useState, useRef } from "react";
import { getPublicDefaultLanguage } from "../api/public.api";
import i18n from "../i18n/config";

/**
 * Hook to load and apply the default language from app settings
 * This should be called once on app initialization
 * Uses the public endpoint (no authentication required)
 */
export function useDefaultLanguage() {
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Track if component is still mounted to prevent state updates after unmount
    isMountedRef.current = true;

    const loadDefaultLanguage = async () => {
      try {
        // Try to get default language from public API endpoint
        const data = await getPublicDefaultLanguage();
        const defaultLang = data.defaultLanguage;

        // Only set default language if no language is stored in localStorage
        // This allows users to override the default with their preference
        const storedLang = localStorage.getItem("i18nextLng");
        if (!storedLang) {
          i18n.changeLanguage(defaultLang);
          localStorage.setItem("i18nextLng", defaultLang);
        }
      } catch (err) {
        // If API call fails, use fallback (default to "hu")
        console.warn("Failed to load default language from API, using fallback", err);
        const storedLang = localStorage.getItem("i18nextLng");
        if (!storedLang) {
          i18n.changeLanguage("hu");
          localStorage.setItem("i18nextLng", "hu");
        }
      } finally {
        // Only update state if component is still mounted
        // This prevents errors during page reloads (e.g., logout redirects)
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadDefaultLanguage();

    return () => {
      // Mark as unmounted to prevent state updates
      isMountedRef.current = false;
    };
  }, []);

  return { isLoading };
}

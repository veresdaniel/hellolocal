// src/hooks/usePageTitle.ts
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Hook to set the page title for admin pages using i18n
 * @param titleKey - The i18n key for the page title (e.g., "admin.dashboard")
 */
export function usePageTitle(titleKey: string) {
  const { t } = useTranslation();

  useEffect(() => {
    const title = t(titleKey);
    document.title = `${title} - Admin`;
  }, [titleKey, t]);
}


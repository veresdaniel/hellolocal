import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sets the browser tab title for an admin page.
 * @param titleKey i18n key, for example "admin.dashboard"
 */
export function usePageTitle(titleKey: string) {
  const { t } = useTranslation();

  useEffect(() => {
    const title = t(titleKey);
    const adminSuffix = t("admin.titleSuffix", { defaultValue: "Admin" });
    const fullTitle = `${title} | ${adminSuffix}`;

    if (fullTitle.length > 50) {
      const truncatedTitle = title.substring(0, 50 - adminSuffix.length - 3) + "...";
      document.title = `${truncatedTitle} | ${adminSuffix}`;
    } else {
      document.title = fullTitle;
    }
  }, [titleKey, t]);
}

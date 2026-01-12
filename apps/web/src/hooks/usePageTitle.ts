// src/hooks/usePageTitle.ts
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings } from "../api/places.api";
import { useContext } from "react";
import { AdminSiteContext } from "../contexts/AdminSiteContext";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG } from "../app/config";

/**
 * Hook to set the page title for admin pages using i18n
 * @param titleKey - The i18n key for the page title (e.g., "admin.dashboard")
 */
export function usePageTitle(titleKey: string) {
  const { t, i18n } = useTranslation();
  const siteContext = useContext(AdminSiteContext);
  const currentSite = siteContext?.sites?.find((s) => s.id === siteContext?.selectedSiteId);
  const lang = i18n.language || "hu";

  // Determine site slug: use current site slug if available, otherwise undefined
  // Don't use DEFAULT_SITE_SLUG in multi-site mode as it may not exist
  const siteSlug = currentSite?.slug;

  // Load site name from settings
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteSlug],
    queryFn: () => getPlatformSettings(lang, siteSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!siteSlug && !siteContext?.isLoading, // Only fetch if we have a valid site slug and sites are loaded
  });

  useEffect(() => {
    const title = t(titleKey);
    const siteName = platformSettings?.siteName || t("common.siteName", { defaultValue: "" });
    const adminSuffix = t("admin.titleSuffix", { defaultValue: "Admin" });
    
    if (siteName) {
      document.title = `${title} - ${adminSuffix} - ${siteName}`;
    } else {
      document.title = `${title} - ${adminSuffix}`;
    }
  }, [titleKey, t, platformSettings?.siteName]);
}


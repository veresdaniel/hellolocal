// src/hooks/usePageTitle.ts
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getSiteSettings } from "../api/places.api";
import { useContext } from "react";
import { AdminTenantContext } from "../contexts/AdminTenantContext";
import { HAS_MULTIPLE_TENANTS } from "../app/config";

/**
 * Hook to set the page title for admin pages using i18n
 * @param titleKey - The i18n key for the page title (e.g., "admin.dashboard")
 */
export function usePageTitle(titleKey: string) {
  const { t, i18n } = useTranslation();
  const tenantContext = useContext(AdminTenantContext);
  const currentTenant = tenantContext?.tenants?.find((t) => t.id === tenantContext?.selectedTenantId);
  const lang = i18n.language || "hu";

  // Load site name from settings
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, currentTenant?.slug],
    queryFn: () => getSiteSettings(lang, currentTenant?.slug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!currentTenant?.slug || !HAS_MULTIPLE_TENANTS,
  });

  useEffect(() => {
    const title = t(titleKey);
    const siteName = siteSettings?.siteName || t("common.siteName", { defaultValue: "" });
    const adminSuffix = t("admin.titleSuffix", { defaultValue: "Admin" });
    
    if (siteName) {
      document.title = `${title} - ${adminSuffix} - ${siteName}`;
    } else {
      document.title = `${title} - ${adminSuffix}`;
    }
  }, [titleKey, t, siteSettings?.siteName]);
}


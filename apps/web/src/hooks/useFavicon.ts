// src/hooks/useFavicon.ts
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getSiteSettings } from "../api/places.api";

/**
 * Hook to dynamically update the favicon based on site settings
 */
export function useFavicon() {
  const { lang, tenantSlug } = useTenantContext();
  const queryClient = useQueryClient();
  
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Listen for site settings changes from admin
  useEffect(() => {
    const handleSiteSettingsChanged = () => {
      // Invalidate and refetch site settings to update favicon
      queryClient.invalidateQueries({ queryKey: ["siteSettings", lang, tenantSlug] });
      queryClient.refetchQueries({ queryKey: ["siteSettings", lang, tenantSlug] });
    };

    window.addEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
    return () => {
      window.removeEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
    };
  }, [lang, tenantSlug, queryClient]);

  useEffect(() => {
    if (!siteSettings?.faviconUrl) return;

    // Find existing favicon links
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]'
    );

    // Remove existing favicons
    existingFavicons.forEach((link) => link.remove());

    // Create new favicon link
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = siteSettings.faviconUrl;
    
    // Add error handling - revert to default if image fails
    const img = new Image();
    img.onerror = () => {
      // If custom favicon fails, don't add it (browser will use default)
      console.warn("[useFavicon] Failed to load custom favicon:", siteSettings.faviconUrl);
    };
    img.onload = () => {
      // Only add if image loads successfully
      document.head.appendChild(link);
    };
    img.src = siteSettings.faviconUrl;

    // Cleanup function
    return () => {
      // Don't remove on unmount - let it persist
    };
  }, [siteSettings?.faviconUrl]);
}

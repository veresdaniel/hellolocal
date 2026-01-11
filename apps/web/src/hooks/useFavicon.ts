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
    if (!siteSettings?.faviconUrl) {
      // Remove any existing custom favicons if faviconUrl is cleared
      const existingFavicons = document.querySelectorAll(
        'link[rel="icon"]:not([href="/vite.svg"]), link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      );
      existingFavicons.forEach((link) => link.remove());
      return;
    }

    // Validate URL format
    let faviconUrl: string;
    try {
      const url = new URL(siteSettings.faviconUrl);
      // Add cache-busting query parameter to force browser to reload favicon
      // Use timestamp to ensure fresh load when favicon changes
      url.searchParams.set('v', Date.now().toString());
      faviconUrl = url.toString();
      console.log("[useFavicon] Setting favicon URL with cache-busting:", faviconUrl);
    } catch {
      console.warn("[useFavicon] Invalid favicon URL format:", siteSettings.faviconUrl);
      return;
    }

    // Find existing favicon links (including apple-touch-icon)
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"]:not([href="/vite.svg"]), link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );

    // Remove existing favicons
    existingFavicons.forEach((link) => link.remove());

    // Add error handling - revert to default if image fails
    const img = new Image();
    
    img.onerror = () => {
      // If custom favicon fails, don't add it (browser will use default)
      console.warn("[useFavicon] Failed to load custom favicon:", faviconUrl);
    };
    
    img.onload = () => {
      // Only add if image loads successfully
      console.log("[useFavicon] Successfully loaded favicon:", faviconUrl);
      
      // Create standard favicon link with cache-busting
      const link = document.createElement("link");
      link.rel = "icon";
      // Try to detect type from URL (remove query params for type detection)
      const urlWithoutParams = faviconUrl.split('?')[0];
      const isSvg = urlWithoutParams.toLowerCase().endsWith('.svg');
      const isIco = urlWithoutParams.toLowerCase().endsWith('.ico');
      link.type = isSvg ? "image/svg+xml" : isIco ? "image/x-icon" : "image/png";
      link.href = faviconUrl;
      document.head.appendChild(link);

      // Also add apple-touch-icon for iOS devices
      const appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      appleLink.href = faviconUrl;
      document.head.appendChild(appleLink);
    };
    
    // Try to load the image (with CORS if needed)
    // Note: Some browsers may block cross-origin favicons, but we try anyway
    // The cache-busting parameter in faviconUrl will force browser to reload
    img.src = faviconUrl;

    // Cleanup function
    return () => {
      // Don't remove on unmount - let it persist
    };
  }, [siteSettings?.faviconUrl]);
}

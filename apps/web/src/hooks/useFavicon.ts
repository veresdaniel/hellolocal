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
    let baseFaviconUrl: string;
    try {
      new URL(siteSettings.faviconUrl);
      baseFaviconUrl = siteSettings.faviconUrl;
    } catch {
      console.warn("[useFavicon] Invalid favicon URL format:", siteSettings.faviconUrl);
      return;
    }

    // Add cache-busting query parameter to force browser to reload favicon
    // Use timestamp to ensure fresh load - this will be different each time the effect runs
    const url = new URL(baseFaviconUrl);
    // Remove existing cache-busting param if present
    url.searchParams.delete('v');
    // Add new cache-busting param with current timestamp
    url.searchParams.set('v', Date.now().toString());
    const faviconUrl = url.toString();
    
    console.log("[useFavicon] Setting favicon URL with cache-busting:", faviconUrl);

    // Find and remove ALL existing favicon links (including default vite.svg if it's not the one we want)
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    existingFavicons.forEach((link) => link.remove());

    // Create new favicon link immediately (don't wait for image load)
    // This forces browser to fetch the new favicon
    const link = document.createElement("link");
    link.rel = "icon";
    link.id = "dynamic-favicon";
    // Try to detect type from URL (remove query params for type detection)
    const urlWithoutParams = baseFaviconUrl.split('?')[0];
    const isSvg = urlWithoutParams.toLowerCase().endsWith('.svg');
    const isIco = urlWithoutParams.toLowerCase().endsWith('.ico');
    link.type = isSvg ? "image/svg+xml" : isIco ? "image/x-icon" : "image/png";
    link.href = faviconUrl;
    document.head.appendChild(link);

    // Also add apple-touch-icon for iOS devices
    const appleLink = document.createElement("link");
    appleLink.rel = "apple-touch-icon";
    appleLink.id = "dynamic-apple-touch-icon";
    appleLink.href = faviconUrl;
    document.head.appendChild(appleLink);

    // Preload the image to verify it works (but don't block on it)
    const img = new Image();
    img.onerror = () => {
      console.warn("[useFavicon] Failed to load custom favicon:", faviconUrl);
      // Don't remove the link - let browser handle it
    };
    img.onload = () => {
      console.log("[useFavicon] Successfully verified favicon:", faviconUrl);
    };
    img.src = faviconUrl;

    // Cleanup function
    return () => {
      // Don't remove on unmount - let it persist
    };
  }, [siteSettings?.faviconUrl]);
}

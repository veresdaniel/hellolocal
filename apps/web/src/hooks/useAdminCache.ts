// src/hooks/useAdminCache.ts
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Global cache management hook for admin pages
 * Automatically invalidates and refetches related caches when entities change
 */
export function useAdminCache() {
  const queryClient = useQueryClient();

  // Listen for global entity change events
  useEffect(() => {
    const handlePlacesChanged = async () => {
      // Invalidate all places-related caches
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["place"] });
      // Events can be linked to places, so invalidate events too
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    };

    const handleEventsChanged = async () => {
      // Invalidate all events-related caches
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    };

    const handleCategoriesChanged = async () => {
      // Categories affect places and events
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
    };

    const handleTownsChanged = async () => {
      // Towns affect places
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
    };

    const handlePriceBandsChanged = async () => {
      // Price bands affect places
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
    };

    const handleTagsChanged = async () => {
      // Tags affect places and events
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.refetchQueries({ queryKey: ["events"] });
    };

    const handleSiteSettingsChanged = async () => {
      // Site settings affect public pages
      await queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      await queryClient.refetchQueries({ queryKey: ["siteSettings"] });
    };

    const handleMapSettingsChanged = async () => {
      // Map settings affect map display
      await queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
      await queryClient.refetchQueries({ queryKey: ["mapSettings"] });
    };

    // Register event listeners
    window.addEventListener("admin:places:changed", handlePlacesChanged);
    window.addEventListener("admin:events:changed", handleEventsChanged);
    window.addEventListener("admin:categories:changed", handleCategoriesChanged);
    window.addEventListener("admin:towns:changed", handleTownsChanged);
    window.addEventListener("admin:priceBands:changed", handlePriceBandsChanged);
    window.addEventListener("admin:tags:changed", handleTagsChanged);
    window.addEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
    window.addEventListener("admin:mapSettings:changed", handleMapSettingsChanged);

    return () => {
      // Cleanup event listeners
      window.removeEventListener("admin:places:changed", handlePlacesChanged);
      window.removeEventListener("admin:events:changed", handleEventsChanged);
      window.removeEventListener("admin:categories:changed", handleCategoriesChanged);
      window.removeEventListener("admin:towns:changed", handleTownsChanged);
      window.removeEventListener("admin:priceBands:changed", handlePriceBandsChanged);
      window.removeEventListener("admin:tags:changed", handleTagsChanged);
      window.removeEventListener("admin:siteSettings:changed", handleSiteSettingsChanged);
      window.removeEventListener("admin:mapSettings:changed", handleMapSettingsChanged);
    };
  }, [queryClient]);
}

/**
 * Helper function to notify that an entity has changed
 * Use this after create/update/delete operations
 */
export function notifyEntityChanged(entityType: "places" | "events" | "categories" | "towns" | "priceBands" | "tags" | "siteSettings" | "mapSettings") {
  window.dispatchEvent(new CustomEvent(`admin:${entityType}:changed`));
}


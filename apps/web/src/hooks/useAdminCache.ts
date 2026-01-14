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
      // Invalidate all places-related caches (including public API caches)
      // invalidateQueries already triggers refetch for active queries, no need for separate refetchQueries
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["place"] });
      // Events can be linked to places, so invalidate events too
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    };

    const handleEventsChanged = async () => {
      // Invalidate all events-related caches
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["event"] });
    };

    const handleCategoriesChanged = async () => {
      // Categories affect places and events
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    };

    const handleTownsChanged = async () => {
      // Towns affect places
      await queryClient.invalidateQueries({ queryKey: ["places"] });
    };

    const handlePriceBandsChanged = async () => {
      // Price bands affect places
      await queryClient.invalidateQueries({ queryKey: ["places"] });
    };

    const handleTagsChanged = async () => {
      // Tags affect places and events
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    };

    const handlePlatformSettingsChanged = async () => {
      // Platform settings affect public pages (Footer, Header, etc.)
      // Invalidate all platformSettings queries regardless of language/tenant
      await queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
      // Explicitly refetch all active platformSettings queries to ensure immediate update
      await queryClient.refetchQueries({ queryKey: ["platformSettings"] });
    };

    const handleMapSettingsChanged = async () => {
      // Map settings affect map display
      await queryClient.invalidateQueries({ queryKey: ["mapSettings"] });
    };

    const handleCollectionsChanged = async () => {
      // Collections affect public collection pages
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      await queryClient.invalidateQueries({ queryKey: ["collection"] });
    };

    // Register event listeners
    window.addEventListener("admin:places:changed", handlePlacesChanged);
    window.addEventListener("admin:events:changed", handleEventsChanged);
    window.addEventListener("admin:categories:changed", handleCategoriesChanged);
    window.addEventListener("admin:towns:changed", handleTownsChanged);
    window.addEventListener("admin:priceBands:changed", handlePriceBandsChanged);
    window.addEventListener("admin:tags:changed", handleTagsChanged);
    window.addEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    window.addEventListener("admin:mapSettings:changed", handleMapSettingsChanged);
    window.addEventListener("admin:collections:changed", handleCollectionsChanged);

    return () => {
      // Cleanup event listeners
      window.removeEventListener("admin:places:changed", handlePlacesChanged);
      window.removeEventListener("admin:events:changed", handleEventsChanged);
      window.removeEventListener("admin:categories:changed", handleCategoriesChanged);
      window.removeEventListener("admin:towns:changed", handleTownsChanged);
      window.removeEventListener("admin:priceBands:changed", handlePriceBandsChanged);
      window.removeEventListener("admin:tags:changed", handleTagsChanged);
      window.removeEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
      window.removeEventListener("admin:mapSettings:changed", handleMapSettingsChanged);
      window.removeEventListener("admin:collections:changed", handleCollectionsChanged);
    };
  }, [queryClient]);
}

/**
 * Helper function to notify that an entity has changed
 * Use this after create/update/delete operations
 */
export function notifyEntityChanged(entityType: "places" | "events" | "categories" | "towns" | "priceBands" | "tags" | "platformSettings" | "mapSettings" | "staticPages" | "collections") {
  window.dispatchEvent(new CustomEvent(`admin:${entityType}:changed`));
}


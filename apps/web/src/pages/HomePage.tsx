// src/pages/HomePage.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces, getMapSettings, getSiteSettings } from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { MapComponent } from "../components/MapComponent";
import { MapFilters } from "../components/MapFilters";
import { PlacesListView } from "../components/PlacesListView";
import { EventsList } from "../components/EventsList";
import { Header } from "../ui/layout/Header";
import { Footer } from "../ui/layout/Footer";
import { buildPath } from "../app/routing/buildPath";
import { useNavigate } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "../app/config";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function HomePage() {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceBands, setSelectedPriceBands] = useState<string[]>([]);
  const compactFooterHeight = 56; // Height of compact footer
  const [mapHeight, setMapHeight] = useState(window.innerHeight - compactFooterHeight);
  
  // Load view preference from localStorage
  const [showMap, setShowMap] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("homeViewPreference");
    return saved !== "list"; // Default to map view if not set or if "map"
  });

  // Get tenantKey for API call (only if multi-tenant mode)
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  // Save view preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("homeViewPreference", showMap ? "map" : "list");
  }, [showMap]);

  useEffect(() => {
    const handleResize = () => {
      setMapHeight(window.innerHeight - compactFooterHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [compactFooterHeight]);

  // Load map settings first to avoid flickering
  const { data: mapSettings, isLoading: isLoadingMapSettings } = useQuery({
    queryKey: ["mapSettings", lang, tenantKey],
    queryFn: () => getMapSettings(lang, tenantKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang],
    queryFn: () => getSiteSettings(lang),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: placesData, isLoading: isLoadingPlaces } = useQuery({
    queryKey: ["places", lang, selectedCategories, selectedPriceBands],
    queryFn: () => getPlaces(
      lang,
      selectedCategories.length > 0 ? selectedCategories : undefined,
      selectedPriceBands.length > 0 ? selectedPriceBands : undefined
    ),
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });

  useSeo({
    title: siteSettings?.seoTitle || t("public.home.title"),
    description: siteSettings?.seoDescription || t("public.home.description"),
  }, {
    siteName: siteSettings?.siteName,
  });

  const placesWithCoordinates = placesData?.filter((place) => place.location && place.location.lat != null && place.location.lng != null) || [];
  const markers = placesWithCoordinates.map((place) => ({
    id: place.slug,
    lat: place.location!.lat!,
    lng: place.location!.lng!,
    name: place.name,
    onClick: () => {
      navigate(buildPath({ tenantSlug, lang, path: `place/${place.slug}` }));
    },
  }));

  // Store the initial map center/zoom to prevent flickering when filters change
  // Only update when mapSettings change, not when places/filters change
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const hasInitializedCenter = useRef(false);
  const initialPlacesLoaded = useRef(false);
  const previousMarkersCount = useRef(0);

  // Initialize map center from settings (only once, or when settings change)
  useEffect(() => {
    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      // Always update if mapSettings changed
      setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
      hasInitializedCenter.current = true;
    } else if (!hasInitializedCenter.current && !initialPlacesLoaded.current && placesWithCoordinates.length > 0 && !isLoadingPlaces) {
      // Only use places center if we don't have map settings and haven't initialized yet
      const avgLat = placesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / placesWithCoordinates.length;
      const avgLng = placesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / placesWithCoordinates.length;
      setMapCenter({ lat: avgLat, lng: avgLng, zoom: mapSettings?.zoom ?? 12 });
      hasInitializedCenter.current = true;
      initialPlacesLoaded.current = true;
      previousMarkersCount.current = placesWithCoordinates.length;
    } else if (!hasInitializedCenter.current && !isLoadingPlaces) {
      // Default to Budapest only if we have no settings and no places yet
      setMapCenter({ lat: 47.4979, lng: 19.0402, zoom: mapSettings?.zoom ?? 13 });
      hasInitializedCenter.current = true;
    }
    
    // Mark places as loaded once we've checked them
    if (!isLoadingPlaces) {
      initialPlacesLoaded.current = true;
    }
  }, [mapSettings?.lat, mapSettings?.lng, mapSettings?.zoom, isLoadingPlaces]);

  // Adjust zoom only if markers don't fit in current viewport (and only when markers change)
  useEffect(() => {
    // Don't adjust zoom if:
    // 1. Map center hasn't been initialized yet
    // 2. We're still loading
    // 3. There are no markers (keep current zoom - don't change)
    // 4. Marker count hasn't changed (filter didn't change the number of visible markers)
    if (!mapCenter || isLoadingPlaces || markers.length === 0) {
      if (markers.length > 0) {
        previousMarkersCount.current = markers.length;
      }
      return;
    }

    // Only adjust if marker count actually changed
    if (markers.length === previousMarkersCount.current) {
      return;
    }

    // Calculate bounding box of all markers
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Calculate required zoom to fit all markers with some padding
    // Approximate: each zoom level doubles/halves the view
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const maxRange = Math.max(latRange, lngRange);

    // Estimate required zoom level (rough calculation)
    // This is approximate - adjust based on testing
    let requiredZoom = 13;
    if (maxRange > 0.1) requiredZoom = 10;
    else if (maxRange > 0.05) requiredZoom = 11;
    else if (maxRange > 0.02) requiredZoom = 12;
    else if (maxRange > 0.01) requiredZoom = 13;
    else if (maxRange > 0.005) requiredZoom = 14;
    else requiredZoom = 15;

    // Only adjust zoom if current zoom is too high (markers don't fit)
    // And only decrease zoom minimally (max 1 level)
    if (mapCenter.zoom > requiredZoom) {
      const newZoom = Math.max(requiredZoom, mapCenter.zoom - 1); // Max decrease by 1 level
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setMapCenter(prev => prev ? { ...prev, zoom: newZoom } : null);
      }, 0);
    }

    previousMarkersCount.current = markers.length;
  }, [markers, mapCenter, isLoadingPlaces]);

  // Calculate center and zoom - use stored center, don't recalculate on filter changes
  const { centerLat, centerLng, defaultZoom } = useMemo(() => {
    if (mapCenter) {
      return {
        centerLat: mapCenter.lat,
        centerLng: mapCenter.lng,
        defaultZoom: mapCenter.zoom,
      };
    }

    // Fallback (shouldn't happen if useEffect works correctly)
    return {
      centerLat: 47.4979,
      centerLng: 19.0402,
      defaultZoom: 13,
    };
  }, [mapCenter]);

  // Don't render map until settings are loaded to avoid flickering
  if (isLoadingMapSettings) {
    return <LoadingSpinner isLoading={true} />;
  }

  return (
    <div
      style={{
        display: showMap ? "flex" : "block",
        flexDirection: showMap ? "column" : undefined,
        position: "relative",
        width: "100%",
        height: showMap ? "100vh" : "auto",
        overflow: showMap ? "hidden" : "visible",
        margin: 0,
        padding: 0,
      }}
    >
      {showMap ? (
        <>
          {/* Map container with flex: 1 to fill available space */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <Header />
            <MapComponent
              latitude={centerLat}
              longitude={centerLng}
              markers={markers}
              height={mapHeight}
              interactive={true}
              defaultZoom={defaultZoom}
              mapStyle="default"
            />
            <EventsList lang={lang} />
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 1000,
                display: "flex",
                gap: 8,
              }}
            >
              <button
                onClick={() => setShowMap(false)}
                style={{
                  padding: "12px 20px",
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: 12,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#333",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                }}
              >
                📋 {t("public.listView")}
              </button>
            </div>
          </div>
          {/* Compact footer - not absolute, in the flow */}
          <Footer lang={lang} tenantSlug={tenantSlug} compact={true} />
          {/* MapFilters at top level to be above footer */}
          <MapFilters
            selectedCategories={selectedCategories}
            selectedPriceBands={selectedPriceBands}
            onCategoriesChange={setSelectedCategories}
            onPriceBandsChange={setSelectedPriceBands}
            lang={lang}
          />
        </>
      ) : (
        <>
          <PlacesListView onMapViewClick={() => setShowMap(true)} />
          {/* Full footer for list view */}
          <Footer lang={lang} tenantSlug={tenantSlug} />
        </>
      )}
    </div>
  );
}

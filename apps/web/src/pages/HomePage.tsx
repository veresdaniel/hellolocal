// src/pages/HomePage.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces, getEvents, getMapSettings, getSiteSettings } from "../api/places.api";
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
import { useFiltersStore } from "../stores/useFiltersStore";
import { useViewStore } from "../stores/useViewStore";

export function HomePage() {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use Zustand stores for state management with persistence
  const {
    selectedCategories,
    selectedPriceBands,
    isOpenNow,
    hasEventToday,
    within30Minutes,
    rainSafe,
    userLocation,
    setSelectedCategories,
    setSelectedPriceBands,
    setIsOpenNow,
    setHasEventToday,
    setWithin30Minutes,
    setRainSafe,
    setUserLocation,
  } = useFiltersStore();
  
  const {
    showMap,
    mapHeight,
    mapCenter,
    setShowMap,
    setMapHeight,
    setMapCenter,
  } = useViewStore();
  
  const compactFooterHeight = 56; // Height of compact footer

  // Get tenantKey for API call (only if multi-tenant mode)
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

  // Listen for place changes from admin panel to refresh map view
  useEffect(() => {
    const handlePlacesChanged = async () => {
      // Invalidate and refetch places cache to show new places on map
      await queryClient.invalidateQueries({ queryKey: ["places"] });
      await queryClient.refetchQueries({ queryKey: ["places"] });
    };

    window.addEventListener("admin:places:changed", handlePlacesChanged);
    return () => {
      window.removeEventListener("admin:places:changed", handlePlacesChanged);
    };
  }, [queryClient]);

  // Update map height when window resizes
  // Update map height when window resizes
  useEffect(() => {
    const handleResize = () => {
      setMapHeight(window.innerHeight - compactFooterHeight);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [setMapHeight, compactFooterHeight]);

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

  // Map center initialization tracking (mapCenter is now in useViewStore)
  const hasInitializedCenter = useRef(false);
  const initialPlacesLoaded = useRef(false);
  const previousMarkersCount = useRef(0);

  // Load events for "hasEventToday" filter
  const { data: eventsData } = useQuery({
    queryKey: ["events", lang, tenantKey],
    queryFn: () => getEvents(lang, undefined, undefined, 100, 0, tenantKey),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: placesData, isLoading: isLoadingPlaces } = useQuery({
    queryKey: ["places", lang, tenantKey, selectedCategories, selectedPriceBands],
    queryFn: () => getPlaces(
      lang,
      tenantKey,
      selectedCategories.length > 0 ? selectedCategories : undefined,
      selectedPriceBands.length > 0 ? selectedPriceBands : undefined
    ),
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: 30 * 1000, // Refetch every 30 seconds in background
    // Remove placeholderData to ensure fresh data is always shown
    // placeholderData can cause stale data to persist
  });

  // Get user location for "within30Minutes" filter
  useEffect(() => {
    if (within30Minutes && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Fallback: use map center if available (check after mapCenter is initialized)
          // We'll set userLocation in a separate effect when mapCenter becomes available
        }
      );
    } else if (!within30Minutes) {
      // Clear user location when filter is disabled
      setUserLocation(null);
    }
  }, [within30Minutes]);

  // Set user location from map center as fallback when map center is available
  useEffect(() => {
    if (within30Minutes && !userLocation && mapCenter) {
      setUserLocation({ lat: mapCenter.lat, lng: mapCenter.lng });
    }
  }, [within30Minutes, mapCenter, userLocation]);

  useSeo({
    title: siteSettings?.seoTitle || t("public.home.title"),
    description: siteSettings?.seoDescription || t("public.home.description"),
  }, {
    siteName: siteSettings?.siteName,
  });

  // Helper function to calculate distance in km using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to check if place is open now (simple check - if openingHours exists)
  const isPlaceOpenNow = (place: typeof placesData[0]): boolean => {
    if (!place.openingHours) return false;
    // Simple heuristic: if openingHours contains HTML or text, assume it might be open
    // In a real implementation, you'd parse the openingHours HTML/JSON
    // For now, we'll just check if openingHours exists
    return true; // Simplified - in production, parse actual hours
  };

  // Helper function to check if place has event today
  const hasEventTodayForPlace = (placeId: string | null | undefined): boolean => {
    if (!eventsData || !placeId) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return eventsData.some((event) => {
      if (event.placeId !== placeId) return false;
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      // Check if event overlaps with today
      return eventStart < tomorrow && eventEnd >= today;
    });
  };

  // Helper function to check if place is within 30 minutes (assuming average speed of 50 km/h = ~25 km in 30 min)
  const isWithin30Minutes = (place: typeof placesData[0]): boolean => {
    if (!within30Minutes || !userLocation || !place.location) return false;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      place.location.lat,
      place.location.lng
    );
    return distance <= 25; // 25 km ≈ 30 minutes at 50 km/h average
  };

  // Helper function to check if place is rain-safe (check tags or extras)
  const isRainSafe = (place: typeof placesData[0]): boolean => {
    if (!rainSafe) return false;
    // Check if place has tags that suggest indoor/covered activities
    const rainSafeTags = ["fedett", "beltér", "indoor", "covered", "binnen", "innen"];
    if (place.tags) {
      const placeTags = place.tags.map((tag) => tag.toLowerCase());
      return rainSafeTags.some((safeTag) =>
        placeTags.some((placeTag) => placeTag.includes(safeTag))
      );
    }
    return false;
  };

  // Filter places based on context filters
  const filteredPlaces = useMemo(() => {
    if (!placesData) return [];
    return placesData.filter((place) => {
      if (isOpenNow && !isPlaceOpenNow(place)) return false;
      if (hasEventToday && !hasEventTodayForPlace(place.id)) return false;
      if (within30Minutes && !isWithin30Minutes(place)) return false;
      if (rainSafe && !isRainSafe(place)) return false;
      return true;
    });
  }, [placesData, isOpenNow, hasEventToday, within30Minutes, rainSafe, userLocation, eventsData]);

  const placesWithCoordinates = filteredPlaces?.filter((place) => place.location && place.location.lat != null && place.location.lng != null) || [];
  const markers = placesWithCoordinates.map((place) => ({
    id: place.slug || place.id, // Use slug if available, otherwise use ID
    lat: place.location!.lat!,
    lng: place.location!.lng!,
    name: place.name,
    onClick: place.slug ? () => {
      navigate(buildPath({ tenantSlug, lang, path: `place/${place.slug}` }));
    } : undefined, // Only allow navigation if slug exists
  }));

  // Initialize map center from settings (only once, or when settings change)
  // Use original placesData (not filtered) for center calculation
  const allPlacesWithCoordinates = placesData?.filter((place) => place.location && place.location.lat != null && place.location.lng != null) || [];
  useEffect(() => {
    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      // Always update if mapSettings changed
      setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
      hasInitializedCenter.current = true;
    } else if (!hasInitializedCenter.current && !initialPlacesLoaded.current && allPlacesWithCoordinates.length > 0 && !isLoadingPlaces) {
      // Only use places center if we don't have map settings and haven't initialized yet
      const avgLat = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / allPlacesWithCoordinates.length;
      const avgLng = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / allPlacesWithCoordinates.length;
      setMapCenter({ lat: avgLat, lng: avgLng, zoom: mapSettings?.zoom ?? 12 });
      hasInitializedCenter.current = true;
      initialPlacesLoaded.current = true;
      previousMarkersCount.current = allPlacesWithCoordinates.length;
    } else if (!hasInitializedCenter.current && !isLoadingPlaces) {
      // Default to Budapest only if we have no settings and no places yet
      setMapCenter({ lat: 47.4979, lng: 19.0402, zoom: mapSettings?.zoom ?? 13 });
      hasInitializedCenter.current = true;
    }
    
    // Mark places as loaded once we've checked them
    if (!isLoadingPlaces) {
      initialPlacesLoaded.current = true;
    }
  }, [mapSettings?.lat, mapSettings?.lng, mapSettings?.zoom, isLoadingPlaces, allPlacesWithCoordinates.length]);

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
            isOpenNow={isOpenNow}
            hasEventToday={hasEventToday}
            within30Minutes={within30Minutes}
            rainSafe={rainSafe}
            onOpenNowChange={setIsOpenNow}
            onHasEventTodayChange={setHasEventToday}
            onWithin30MinutesChange={setWithin30Minutes}
            onRainSafeChange={setRainSafe}
            lang={lang}
          />
        </>
      ) : (
        <>
          <PlacesListView
            onMapViewClick={() => setShowMap(true)}
            selectedCategories={selectedCategories}
            selectedPriceBands={selectedPriceBands}
            onCategoriesChange={setSelectedCategories}
            onPriceBandsChange={setSelectedPriceBands}
            isOpenNow={isOpenNow}
            hasEventToday={hasEventToday}
            within30Minutes={within30Minutes}
            rainSafe={rainSafe}
            onOpenNowChange={setIsOpenNow}
            onHasEventTodayChange={setHasEventToday}
            onWithin30MinutesChange={setWithin30Minutes}
            onRainSafeChange={setRainSafe}
          />
          {/* Full footer for list view */}
          <Footer lang={lang} tenantSlug={tenantSlug} />
        </>
      )}
    </div>
  );
}

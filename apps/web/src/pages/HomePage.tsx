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
    _hasHydrated,
    showUserLocation,
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
  
  const [isMobile, setIsMobile] = useState(false);
  
  // Calculate actual footer height on mobile
  // Mobile: padding 12px top + 12px bottom + content height (font 14px + line height) = ~48-52px
  // Desktop: padding 16px top + 16px bottom + content = ~56px
  const compactFooterHeight = isMobile ? 52 : 56;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
  useEffect(() => {
    const handleResize = () => {
      const footerHeight = window.innerWidth < 768 ? 52 : 56;
      setMapHeight(window.innerHeight - footerHeight);
    };
    if (typeof window !== "undefined") {
      handleResize(); // Set initial height
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [setMapHeight, isMobile]);

  // Load map settings first to avoid flickering
  // Don't cache too aggressively - need to refresh on lang/tenant change
  const { data: mapSettings, isLoading: isLoadingMapSettings, dataUpdatedAt } = useQuery({
    queryKey: ["mapSettings", lang, tenantKey],
    queryFn: async () => {
      const result = await getMapSettings(lang, tenantKey);
      return result;
    },
    staleTime: 0, // Always consider stale to ensure fresh data on lang/tenant change
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 0, // Don't keep in cache (formerly cacheTime)
  });

  // Load site settings for SEO
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings", lang, tenantSlug],
    queryFn: () => getSiteSettings(lang, tenantSlug),
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

  const { data: placesData, isLoading: isLoadingPlaces, isError: isPlacesError, error: placesError } = useQuery({
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
    retry: false, // Don't retry on error (404 is expected for some languages)
    // Remove placeholderData to ensure fresh data is always shown
    // placeholderData can cause stale data to persist
  });
  

  // Get user location - always try to get it if available, not just for filter
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const watchIdRef = useRef<number | null>(null);
  const hasRequestedLocation = useRef(false);
  
  // Wait for store to hydrate before using userLocation
  // Also manually check and set hydration flag if onRehydrateStorage didn't fire
  useEffect(() => {
    // If store is not hydrated yet, check if we can manually detect hydration
    if (!_hasHydrated) {
      // Check if localStorage has data (indicating store should be hydrated)
      try {
        const stored = localStorage.getItem("home-filters-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          const persistedLocation = parsed.state?.userLocation;
          // If we have persisted data, manually trigger hydration after a short delay
          const timeoutId = setTimeout(() => {
            const storeState = useFiltersStore.getState();
            if (!storeState._hasHydrated && persistedLocation) {
              useFiltersStore.getState().setHasHydrated(true);
              if (persistedLocation && persistedLocation.lat && persistedLocation.lng) {
                setUserLocation(persistedLocation);
              }
            }
          }, 50); // Small delay to allow zustand to finish
          
          return () => clearTimeout(timeoutId);
        }
      } catch (e) {
        // Failed to check localStorage for hydration
      }
    }
  }, [_hasHydrated, userLocation, setUserLocation, showUserLocation]);
  
  // Clear userLocation when showUserLocation is disabled
  // Or restore it from localStorage when enabled
  useEffect(() => {
    if (!showUserLocation) {
      // Clear any existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Reset hasRequestedLocation so we can request again when enabled
      hasRequestedLocation.current = false;
      // Clear userLocation from store when disabled
      setUserLocation(null);
    } else {
      // When enabled, try to restore from localStorage immediately
      try {
        const stored = localStorage.getItem("home-filters-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          const savedLocation = parsed.state?.userLocation;
          if (savedLocation && savedLocation.lat && savedLocation.lng) {
            setUserLocation(savedLocation);
            // Reset hasRequestedLocation to allow new request
            hasRequestedLocation.current = false;
          }
        }
      } catch (e) {
        // Failed to restore location from localStorage
      }
    }
  }, [showUserLocation, setUserLocation]);
  
  // Note: Geolocation is now handled by MapComponent checkbox onChange (user gesture context)
  // This effect only watches for updates if we already have a location
  useEffect(() => {
    if (!navigator.geolocation || !showUserLocation) {
      return;
    }
    
    // Only watch for updates if we already have a userLocation
    // Don't request new location here - MapComponent handles that in user gesture context
    const storeState = useFiltersStore.getState();
    const currentUserLocation = userLocation || storeState.userLocation;
    
    if (currentUserLocation && typeof currentUserLocation.lat === "number" && typeof currentUserLocation.lng === "number") {
      // Only start watching if we're not already watching
      if (watchIdRef.current === null) {
        setLocationPermission("granted");
        // Start watching for updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermission("denied");
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000,
          }
        );
      }
    }
    
    // Cleanup watch on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [userLocation, setUserLocation, showUserLocation, _hasHydrated]);

  // Also handle within30Minutes filter requirement
  useEffect(() => {
    if (within30Minutes && !userLocation && navigator.geolocation && locationPermission === "prompt") {
      // If filter is enabled but we don't have location yet, try again
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission("granted");
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission("denied");
          }
        }
      );
    }
  }, [within30Minutes, userLocation, locationPermission]);

  // Set user location from map center as fallback when map center is available
  useEffect(() => {
    if (within30Minutes && !userLocation && mapCenter) {
      setUserLocation({ lat: mapCenter.lat, lng: mapCenter.lng });
    }
  }, [within30Minutes, mapCenter, userLocation]);

  useSeo({
    title: siteSettings?.seoTitle || t("public.home.title"),
    description: siteSettings?.seoDescription || t("public.home.description"),
    image: siteSettings?.defaultPlaceholderCardImage || undefined,
    og: {
      type: "website",
      title: siteSettings?.seoTitle || siteSettings?.siteName || t("public.home.title"),
      description: siteSettings?.seoDescription || t("public.home.description"),
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
    twitter: {
      card: siteSettings?.defaultPlaceholderCardImage ? "summary_large_image" : "summary",
      title: siteSettings?.seoTitle || siteSettings?.siteName || t("public.home.title"),
      description: siteSettings?.seoDescription || t("public.home.description"),
      image: siteSettings?.defaultPlaceholderCardImage || undefined,
    },
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

  // Helper function to check if place is open now
  const isPlaceOpenNow = (place: typeof placesData[0]): boolean => {
    if (!place.openingHours || !Array.isArray(place.openingHours) || place.openingHours.length === 0) return false;
    
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Convert Sunday (0) to last (6), Monday (1) to 0, etc.
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find today's opening hours
    const todayHours = place.openingHours.find((oh) => oh.dayOfWeek === currentDayOfWeek);
    
    if (!todayHours) return false;
    if (todayHours.isClosed) return false;
    if (!todayHours.openTime || !todayHours.closeTime) return false;
    
    // Check if current time is between open and close time
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
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

  // Helper function to check if place is within 10 minutes walking distance (~1 km)
  const isWithin10MinutesWalk = (place: typeof placesData[0]): boolean => {
    if (!within30Minutes || !userLocation || !place.location) return false;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      place.location.lat,
      place.location.lng
    );
    return distance <= 1; // 1 km ≈ 10 minutes walking at average pace
  };

  // Helper function to check if place is rain-safe
  // A place is rain-safe if it has at least one event today that is rain-safe
  const isRainSafe = (place: typeof placesData[0]): boolean => {
    if (!rainSafe || !eventsData || !place.id) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if place has a rain-safe event today
    return eventsData.some((event) => {
      if (event.placeId !== place.id) return false;
      if (!event.isRainSafe) return false;
      
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return eventStart < tomorrow && eventEnd >= today;
    });
  };

  // Filter places based on context filters
  // Handle case where placesData is undefined (e.g., 404 error or no data)
  const filteredPlaces = useMemo(() => {
    if (!placesData || !Array.isArray(placesData)) return [];
    return placesData.filter((place) => {
      if (isOpenNow && !isPlaceOpenNow(place)) return false;
      if (hasEventToday && !hasEventTodayForPlace(place.id)) return false;
      if (within30Minutes && !isWithin10MinutesWalk(place)) return false;
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
      const path = buildPath({ tenantSlug, lang, path: `place/${place.slug}` });
      navigate(path);
    } : undefined, // Only allow navigation if slug exists
  }));

  // Initialize map center from settings (only once, or when settings change)
  // Use original placesData (not filtered) for center calculation
  const allPlacesWithCoordinates = placesData?.filter((place) => place.location && place.location.lat != null && place.location.lng != null) || [];
  
  // Reset initialization flags when lang or tenant changes
  useEffect(() => {
    hasInitializedCenter.current = false;
    initialPlacesLoaded.current = false;
  }, [lang, tenantKey]);
  
  // Force reset and update when lang or tenant changes (ensures fresh initialization)
  useEffect(() => {
    // Reset flags when lang or tenant changes
    hasInitializedCenter.current = false;
    initialPlacesLoaded.current = false;
  }, [lang, tenantKey]);
  
  // Track previous mapSettings values to detect actual changes
  const prevMapSettingsRef = useRef<{ lat: number | null; lng: number | null; zoom: number | null } | null>(null);
  // Initialize with null to detect initial mount
  const prevLangRef = useRef<string | null>(null);
  const prevTenantKeyRef = useRef<string | undefined>(undefined);
  
  // Update map center when mapSettings loads or changes (including on lang/tenant change)
  // This is the primary effect that should always run when mapSettings is available
  useEffect(() => {
    // Wait for mapSettings to load
    if (isLoadingMapSettings) {
      return;
    }
    
    // Check if lang or tenantKey changed (force update even if mapSettings values are the same)
    // On initial mount, prevLangRef will be null, so we want to update
    const isInitialMount = prevLangRef.current === null;
    const langChanged = !isInitialMount && prevLangRef.current !== lang;
    const tenantKeyChanged = !isInitialMount && prevTenantKeyRef.current !== tenantKey;
    const mapSettingsChanged = prevMapSettingsRef.current === null || 
      prevMapSettingsRef.current.lat !== mapSettings?.lat ||
      prevMapSettingsRef.current.lng !== mapSettings?.lng ||
      prevMapSettingsRef.current.zoom !== mapSettings?.zoom;
    
    // Update refs
    if (isInitialMount || langChanged || tenantKeyChanged) {
      prevLangRef.current = lang;
      prevTenantKeyRef.current = tenantKey;
    }
    
    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      // Always update if mapSettings is available (including on initial load and lang/tenant change)
      // Force update if lang/tenant changed, or on initial mount, or if mapSettings changed, or if not initialized yet
      // Also check if current mapCenter doesn't match mapSettings (safety check)
      const currentCenterMatches = mapCenter && 
        Math.abs(mapCenter.lat - mapSettings.lat) < 0.0001 && 
        Math.abs(mapCenter.lng - mapSettings.lng) < 0.0001;
      
      if (isInitialMount || langChanged || tenantKeyChanged || mapSettingsChanged || !hasInitializedCenter.current || !currentCenterMatches) {
        setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
        hasInitializedCenter.current = true;
        prevMapSettingsRef.current = { lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? null };
        return; // Exit early if we have map settings
      }
    }
    
    // Fallback: only use places center if we don't have map settings and haven't initialized yet
    if (!hasInitializedCenter.current && !initialPlacesLoaded.current && allPlacesWithCoordinates.length > 0 && !isLoadingPlaces) {
      const avgLat = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / allPlacesWithCoordinates.length;
      const avgLng = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / allPlacesWithCoordinates.length;
      setMapCenter({ lat: avgLat, lng: avgLng, zoom: mapSettings?.zoom ?? 12 });
      hasInitializedCenter.current = true;
      initialPlacesLoaded.current = true;
      previousMarkersCount.current = allPlacesWithCoordinates.length;
    } else if (!hasInitializedCenter.current && !isLoadingPlaces && !isLoadingMapSettings) {
      // Default to Budapest only if we have no settings and no places yet
      setMapCenter({ lat: 47.4979, lng: 19.0402, zoom: mapSettings?.zoom ?? 13 });
      hasInitializedCenter.current = true;
    }
    
    // Mark places as loaded once we've checked them
    if (!isLoadingPlaces) {
      initialPlacesLoaded.current = true;
    }
  }, [mapSettings, isLoadingPlaces, isLoadingMapSettings, allPlacesWithCoordinates.length, lang, tenantKey, setMapCenter, dataUpdatedAt, mapCenter]);

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
  // If mapCenter is not set yet, use mapSettings directly as fallback
  const { centerLat, centerLng, defaultZoom } = useMemo(() => {
    if (mapCenter) {
      return {
        centerLat: mapCenter.lat,
        centerLng: mapCenter.lng,
        defaultZoom: mapCenter.zoom,
      };
    }
    
    // Fallback to mapSettings if available
    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      return {
        centerLat: mapSettings.lat,
        centerLng: mapSettings.lng,
        defaultZoom: mapSettings.zoom ?? 13,
      };
    }

    // Final fallback (shouldn't happen if useEffect works correctly)
    return {
      centerLat: 47.4979,
      centerLng: 19.0402,
      defaultZoom: 13,
    };
  }, [mapCenter, mapSettings]);

  // If mapSettings is loaded but mapCenter is not set yet, use mapSettings directly
  // This can happen when lang changes and mapSettings loads but mapCenter update is pending
  // Use useEffect to set mapCenter immediately when mapSettings loads
  useEffect(() => {
    if (!isLoadingMapSettings && mapSettings && mapSettings.lat != null && mapSettings.lng != null) {
      if (!mapCenter || Math.abs(mapCenter.lat - mapSettings.lat) > 0.0001 || Math.abs(mapCenter.lng - mapSettings.lng) > 0.0001) {
        setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
        hasInitializedCenter.current = true;
      }
    }
  }, [mapSettings, isLoadingMapSettings, mapCenter, setMapCenter]);

  // Don't render map until settings are loaded to avoid flickering
  if (isLoadingMapSettings) {
    return <LoadingSpinner isLoading={true} />;
  }

  return (
    <div
      style={{
        display: showMap ? (isMobile ? "block" : "flex") : "block",
        flexDirection: showMap && !isMobile ? "column" : undefined,
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
          {/* Map container - fills viewport on mobile, flex on desktop */}
          <div 
            style={{ 
              ...(isMobile 
                ? { 
                    height: `calc(100vh - 52px)`,
                    position: "relative",
                    overflow: "hidden",
                    margin: 0,
                    padding: 0,
                    boxSizing: "border-box",
                  }
                : {
                    flex: 1,
                    position: "relative",
                    overflow: "hidden"
                  }
              )
            }}
          >
            <Header />
            <MapComponent
              latitude={centerLat}
              longitude={centerLng}
              markers={markers}
              userLocation={userLocation || useFiltersStore.getState().userLocation}
              showRoutes={false}
              height={isMobile && typeof window !== "undefined" ? window.innerHeight - 52 : mapHeight}
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
          {/* Compact footer - fixed positioned at bottom on mobile */}
          {isMobile ? (
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                width: "100%",
                zIndex: 100,
                margin: 0,
                padding: 0,
              }}
            >
              <Footer lang={lang} tenantSlug={tenantSlug} compact={true} />
            </div>
          ) : (
            <Footer lang={lang} tenantSlug={tenantSlug} compact={true} />
          )}
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

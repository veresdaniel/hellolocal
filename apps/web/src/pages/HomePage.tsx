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
  // Don't cache too aggressively - need to refresh on lang/tenant change
  const { data: mapSettings, isLoading: isLoadingMapSettings, dataUpdatedAt } = useQuery({
    queryKey: ["mapSettings", lang, tenantKey],
    queryFn: async () => {
      console.log("Fetching mapSettings for lang:", lang, "tenantKey:", tenantKey);
      const result = await getMapSettings(lang, tenantKey);
      console.log("mapSettings fetched:", result, "for lang:", lang, "tenantKey:", tenantKey);
      return result;
    },
    staleTime: 0, // Always consider stale to ensure fresh data on lang/tenant change
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 0, // Don't keep in cache (formerly cacheTime)
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
  
  // Log error if places query fails
  useEffect(() => {
    if (isPlacesError) {
      console.warn("Places query error:", placesError, "lang:", lang, "tenantKey:", tenantKey);
    }
  }, [isPlacesError, placesError, lang, tenantKey]);

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
              console.log("Manually setting hydration flag, userLocation:", persistedLocation);
              useFiltersStore.getState().setHasHydrated(true);
              if (persistedLocation && persistedLocation.lat && persistedLocation.lng) {
                setUserLocation(persistedLocation);
              }
            }
          }, 50); // Small delay to allow zustand to finish
          
          return () => clearTimeout(timeoutId);
        }
      } catch (e) {
        console.warn("Failed to check localStorage for hydration:", e);
      }
    } else if (_hasHydrated && userLocation && userLocation.lat && userLocation.lng) {
      console.log("Store hydrated, userLocation available:", userLocation);
    }
  }, [_hasHydrated, userLocation, setUserLocation, showUserLocation]);
  
  // Clear userLocation when showUserLocation is disabled
  // Or restore it from localStorage when enabled
  useEffect(() => {
    if (!showUserLocation) {
      console.log("showUserLocation disabled, clearing userLocation");
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
      console.log("showUserLocation enabled, checking for saved location");
      try {
        const stored = localStorage.getItem("home-filters-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          const savedLocation = parsed.state?.userLocation;
          if (savedLocation && savedLocation.lat && savedLocation.lng) {
            console.log("Restoring saved location from localStorage:", savedLocation);
            setUserLocation(savedLocation);
            // Reset hasRequestedLocation to allow new request
            hasRequestedLocation.current = false;
          }
        }
      } catch (e) {
        console.warn("Failed to restore location from localStorage:", e);
      }
    }
  }, [showUserLocation, setUserLocation]);
  
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log("Geolocation not available");
      return;
    }
    
    // Don't request geolocation if showUserLocation is disabled
    if (!showUserLocation) {
      console.log("User location disabled, not requesting geolocation");
      return;
    }
    
    // Check store state directly as fallback (don't wait for hydration if showUserLocation is enabled)
    const storeState = useFiltersStore.getState();
    const currentUserLocation = userLocation || storeState.userLocation;
    
    // If we already have a userLocation (from localStorage or store), use it and start watching
    if (currentUserLocation && typeof currentUserLocation.lat === "number" && typeof currentUserLocation.lng === "number") {
      // Only start watching if we're not already watching
      if (watchIdRef.current === null) {
        console.log("Using existing userLocation from store:", currentUserLocation);
        setLocationPermission("granted");
        // Start watching for updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            console.log("Position updated:", updatedPosition.coords.latitude, updatedPosition.coords.longitude);
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            console.warn("Geolocation watch error:", error);
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
        hasRequestedLocation.current = true;
      }
      return;
    }
    
    // If we're already watching, don't request again
    if (watchIdRef.current !== null) {
      console.log("Already watching position, skipping new request");
      return;
    }
    
    if (hasRequestedLocation.current) {
      console.log("Already requested location, skipping new request. watchIdRef:", watchIdRef.current);
      return;
    }
    
    console.log("Requesting geolocation... showUserLocation:", showUserLocation, "hasRequestedLocation:", hasRequestedLocation.current);
    hasRequestedLocation.current = true;
    
    // Try to get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Geolocation success:", position.coords.latitude, position.coords.longitude);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationPermission("granted");
        
        // Watch position for updates (especially useful on mobile)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            console.log("Position updated:", updatedPosition.coords.latitude, updatedPosition.coords.longitude);
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            console.warn("Geolocation watch error:", error);
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
      },
      (error) => {
        console.warn("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
          console.log("Location permission denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.log("Position unavailable");
        } else if (error.code === error.TIMEOUT) {
          console.log("Geolocation timeout");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000, // Accept cached position up to 5 minutes old (for page refresh)
        timeout: 15000,
      }
    );
    
    // Cleanup watch on unmount
    return () => {
      if (watchIdRef.current !== null) {
        console.log("Clearing geolocation watch");
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
          console.warn("Geolocation error:", error);
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
  // Handle case where placesData is undefined (e.g., 404 error or no data)
  const filteredPlaces = useMemo(() => {
    if (!placesData || !Array.isArray(placesData)) return [];
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
      const path = buildPath({ tenantSlug, lang, path: `place/${place.slug}` });
      console.log("Navigating to place:", place.slug, "path:", path, "tenantSlug:", tenantSlug, "lang:", lang);
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
    console.log("Lang or tenant changed, resetting flags. lang:", lang, "tenantKey:", tenantKey);
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
      console.log("Waiting for mapSettings to load... lang:", lang, "tenantKey:", tenantKey);
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
      if (langChanged || tenantKeyChanged) {
        console.log("Lang or tenantKey changed, forcing map center update. lang:", lang, "tenantKey:", tenantKey, "prevLang:", prevLangRef.current, "prevTenantKey:", prevTenantKeyRef.current);
      }
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
        console.log("Updating map center from mapSettings:", mapSettings, "lang:", lang, "tenantKey:", tenantKey, "dataUpdatedAt:", dataUpdatedAt, "current mapCenter:", mapCenter, "isInitialMount:", isInitialMount, "langChanged:", langChanged, "tenantKeyChanged:", tenantKeyChanged, "mapSettingsChanged:", mapSettingsChanged, "hasInitializedCenter:", hasInitializedCenter.current, "currentCenterMatches:", currentCenterMatches);
        setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
        hasInitializedCenter.current = true;
        prevMapSettingsRef.current = { lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? null };
        return; // Exit early if we have map settings
      } else {
        console.log("Skipping map center update (no change detected):", { mapSettings, lang, tenantKey, "prevMapSettings": prevMapSettingsRef.current, "hasInitializedCenter": hasInitializedCenter.current, "currentCenterMatches": currentCenterMatches });
      }
    } else {
      console.warn("mapSettings has no lat/lng:", mapSettings, "lang:", lang, "tenantKey:", tenantKey);
    }
    
    // Fallback: only use places center if we don't have map settings and haven't initialized yet
    if (!hasInitializedCenter.current && !initialPlacesLoaded.current && allPlacesWithCoordinates.length > 0 && !isLoadingPlaces) {
      const avgLat = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / allPlacesWithCoordinates.length;
      const avgLng = allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / allPlacesWithCoordinates.length;
      console.log("Using places center as fallback:", { lat: avgLat, lng: avgLng });
      setMapCenter({ lat: avgLat, lng: avgLng, zoom: mapSettings?.zoom ?? 12 });
      hasInitializedCenter.current = true;
      initialPlacesLoaded.current = true;
      previousMarkersCount.current = allPlacesWithCoordinates.length;
    } else if (!hasInitializedCenter.current && !isLoadingPlaces && !isLoadingMapSettings) {
      // Default to Budapest only if we have no settings and no places yet
      console.log("Using default Budapest center");
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
      console.log("Using mapSettings as fallback for center calculation:", mapSettings);
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
        console.log("Setting mapCenter immediately from mapSettings:", mapSettings, "current mapCenter:", mapCenter);
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
              userLocation={userLocation || useFiltersStore.getState().userLocation}
              showRoutes={false}
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

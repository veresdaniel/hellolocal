// src/pages/HomePage.tsx
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouteCtx } from "../app/useRouteCtx";
import {
  getPlaces,
  getEvents,
  getMapSettings,
  getPlatformSettings,
  getPublicTowns,
  type PublicTown,
} from "../api/places.api";
import { useSeo } from "../seo/useSeo";
import { absoluteCanonical } from "../seo/canonical";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  robotsDirective,
} from "../seo/schemaOrg";
import { MapDock } from "../components/MapDock";
import { PlacesListView } from "../components/PlacesListView";
import { Header } from "../ui/layout/Header";
import { buildUrl } from "../app/urls";
import { placeEntityPath, townEntityPath } from "../app/entityPaths";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HAS_MULTIPLE_SITES, type Lang} from "../app/config";
import { BREAKPOINTS } from "../utils/viewport";
import { PublicCardSkeletonGrid, PublicPageSkeleton } from "../components/PublicSkeleton";
import { ErrorState } from "../components/ErrorState";
import { useFiltersStore } from "../stores/useFiltersStore";
import { useViewStore } from "../stores/useViewStore";
import { SiteLanding } from "../components/SiteLanding";
import { RegionTownsIndex } from "../components/RegionTownsIndex";
import {
  clearExploreRequest,
  openSiteExplore,
  peekExploreRequest,
  readSiteLanding,
} from "../utils/siteLanding";
import { usePublicGaOverride } from "../context/PublicGaOverrideContext";

// MapLibre only when map view is shown — keeps list/landing/overview free of map-vendor
const MapComponent = lazy(() =>
  import("../components/MapComponent").then((m) => ({ default: m.MapComponent }))
);

export function HomePage() {
  const { t } = useTranslation();
  const { lang, siteKey } = useRouteCtx();
  const navigate = useNavigate();
  const { townSlug: townSlugParam } = useParams<{ townSlug?: string }>();
  const [searchParams] = useSearchParams();
  // Prefer path segment (/telepules|:town|:gemeinde/:slug); keep ?town= as legacy alias
  const townSlug = townSlugParam?.trim() || searchParams.get("town")?.trim() || undefined;

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

  const { showMap, mapHeight, mapCenter, setShowMap, setMapHeight, setMapCenter } = useViewStore();

  const [isMobile, setIsMobile] = useState(false);
  const [mapPanel, setMapPanel] = useState<"filters" | "events" | "services" | null>(null);
  const [landingDismissed, setLandingDismissed] = useState(() => peekExploreRequest() !== null);

  useEffect(() => {
    setLandingDismissed(peekExploreRequest() !== null);
    clearExploreRequest();
  }, [siteKey]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
      const footerHeight = window.innerWidth < 768 ? 52 : 56;
      setMapHeight(window.innerHeight - footerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setMapHeight]);

  useEffect(() => {
    const handleShowMapView = () => {
      clearExploreRequest();
      setLandingDismissed(true);
      setShowMap(true);
    };
    const handleShowListView = () => {
      clearExploreRequest();
      setLandingDismissed(true);
      setShowMap(false);
    };

    window.addEventListener("showMapView", handleShowMapView);
    window.addEventListener("showListView", handleShowListView);
    return () => {
      window.removeEventListener("showMapView", handleShowMapView);
      window.removeEventListener("showListView", handleShowListView);
    };
  }, [setShowMap]);

  // Load map settings first to avoid flickering
  // Don't cache too aggressively - need to refresh on lang/tenant change
  const {
    data: mapSettings,
    isLoading: isLoadingMapSettings,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["mapSettings", lang, siteKey],
    queryFn: async () => {
      const result = await getMapSettings(lang, siteKey);
      return result;
    },
    staleTime: 0, // Always consider stale to ensure fresh data on lang/tenant change
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 0, // Don't keep in cache (formerly cacheTime)
  });

  // Load site settings for SEO + optional opening page
  const { data: platformSettings, isPending: isLoadingPlatformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: ({ signal }) => getPlatformSettings(lang, siteKey, { signal }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Map center initialization tracking (mapCenter is now in useViewStore)
  const hasInitializedCenter = useRef(false);
  const initialPlacesLoaded = useRef(false);
  const previousMarkersCount = useRef(0);
  const hasEverLoadedPlaces = useRef(false);

  // Load events for "hasEventToday" filter
  const { data: eventsData } = useQuery({
    queryKey: ["events", lang, siteKey],
    queryFn: () => getEvents(lang, siteKey || "default", undefined, undefined, 100, 0),
    enabled: !!siteKey, // Only fetch if we have a siteKey
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: townsPayload, isPending: isLoadingTowns } = useQuery({
    queryKey: ["publicTowns", lang, siteKey],
    queryFn: () => getPublicTowns(lang, siteKey || "default"),
    enabled: !!siteKey,
    staleTime: 5 * 60 * 1000,
  });

  const selectedTown = useMemo(() => {
    if (!townSlug || !townsPayload?.towns?.length) return null;
    return townsPayload.towns.find((t: PublicTown) => t.slug === townSlug) ?? null;
  }, [townSlug, townsPayload]);
  const townGaId = selectedTown?.gaMeasurementId ?? null;
  usePublicGaOverride(townGaId);

  const {
    data: placesData,
    isLoading: isLoadingPlaces,
    isError: isPlacesError,
    error: placesError,
  } = useQuery({
    queryKey: ["places", lang, siteKey, selectedCategories, selectedPriceBands, townSlug],
    queryFn: () =>
      getPlaces(
        lang,
        siteKey,
        selectedCategories.length > 0 ? selectedCategories : undefined,
        selectedPriceBands.length > 0 ? selectedPriceBands : undefined,
        undefined,
        200,
        0,
        "place",
        townSlug
      ),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (increased from 60s)
    refetchOnWindowFocus: false, // Don't refetch on window focus (reduce API calls)
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes in background (increased from 5min)
    retry: false, // Don't retry on error (404 is expected for some languages)
    placeholderData: (previousData) => previousData, // Keep previous data visible while fetching new data (prevents screen flash)
  });

  const { data: servicePlaces = [] } = useQuery({
    queryKey: ["places", lang, siteKey, "service"],
    queryFn: () => getPlaces(lang, siteKey, undefined, undefined, undefined, 200, 0, "service"),
    enabled: mapPanel === "services" && !!siteKey,
    staleTime: 5 * 60 * 1000,
  });

  // Track if we've ever successfully loaded places data
  useEffect(() => {
    if (placesData && Array.isArray(placesData)) {
      hasEverLoadedPlaces.current = true;
    }
  }, [placesData]);

  // Get user location - always try to get it if available, not just for filter
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">(
    "prompt"
  );
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
  // NOTE: watchPosition is handled entirely by MapComponent to prevent duplicate watches and infinite loops
  useEffect(() => {
    if (!showUserLocation) {
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

  // Update locationPermission when userLocation changes (for UI feedback)
  // This doesn't trigger watchPosition, just updates permission state
  useEffect(() => {
    if (
      userLocation &&
      typeof userLocation.lat === "number" &&
      typeof userLocation.lng === "number"
    ) {
      setLocationPermission("granted");
    }
  }, [userLocation]);

  // Also handle within30Minutes filter requirement
  useEffect(() => {
    if (
      within30Minutes &&
      !userLocation &&
      navigator.geolocation &&
      locationPermission === "prompt"
    ) {
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

  const siteUrl = window.location.origin;
  const siteName = platformSettings?.siteName || t("common.siteName");
  const pageCanonical = absoluteCanonical();
  const stripHtml = (html: string | null | undefined) =>
    (html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const homeTitle = selectedTown
    ? selectedTown.name
    : platformSettings?.seoTitle || t("public.home.title");
  const homeDescription = selectedTown
    ? stripHtml(selectedTown.description) ||
      t("public.home.description") ||
      platformSettings?.seoDescription ||
      ""
    : platformSettings?.seoDescription || t("public.home.description");
  const homeImage =
    selectedTown?.heroImage || platformSettings?.defaultPlaceholderCardImage || undefined;

  const homeSeo = useMemo(
    () => ({
      title: homeTitle,
      description: homeDescription,
      image: homeImage,
      canonical: pageCanonical,
      robots: robotsDirective(platformSettings?.isCrawlable),
      og: {
        type: "website" as const,
        title: homeTitle || siteName,
        description: homeDescription,
        image: homeImage,
      },
      twitter: {
        card: (homeImage ? "summary_large_image" : "summary") as
          | "summary_large_image"
          | "summary",
        title: homeTitle || siteName,
        description: homeDescription,
        image: homeImage,
      },
      schemaOrg: selectedTown
        ? {
            type: "WebPage" as const,
            data: {
              name: homeTitle,
              description: homeDescription,
              url: pageCanonical,
              inLanguage: lang,
              isPartOf: { name: siteName, url: siteUrl },
            },
          }
        : {
            type: "Graph" as const,
            data: [
              generateOrganizationSchema({
                name: siteName,
                description: homeDescription,
                url: pageCanonical,
                logo: platformSettings?.faviconUrl || undefined,
              }),
              generateWebSiteSchema({
                name: siteName,
                description: homeDescription,
                url: pageCanonical,
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${pageCanonical}/?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              }),
            ],
          },
    }),
    [
      homeTitle,
      homeDescription,
      homeImage,
      pageCanonical,
      platformSettings?.isCrawlable,
      platformSettings?.faviconUrl,
      siteName,
      selectedTown,
      lang,
      siteUrl,
    ]
  );

  useSeo(homeSeo, {
    siteName: platformSettings?.siteName,
  });

  // Helper function to calculate distance in km using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to check if place is open now
  const isPlaceOpenNow = (place: (typeof placesData)[0]): boolean => {
    if (
      !place.openingHours ||
      !Array.isArray(place.openingHours) ||
      place.openingHours.length === 0
    )
      return false;

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Convert Sunday (0) to last (6), Monday (1) to 0, etc.
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

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
  const isWithin10MinutesWalk = (place: (typeof placesData)[0]): boolean => {
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
  const isRainSafe = (place: (typeof placesData)[0]): boolean => {
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
  // Also apply category/price filters client-side so placeholderData cannot keep
  // unrelated places (or look like a mixed feed) while the query refetches.
  const filteredPlaces = useMemo(() => {
    const source = mapPanel === "services" ? servicePlaces : placesData;
    if (!source || !Array.isArray(source)) return [];
    const categorySet = new Set(selectedCategories.map((name) => name.toLowerCase()));
    const priceSet = new Set(selectedPriceBands.map((id) => id.toLowerCase()));
    return source.filter((place) => {
      const kind = place.categoryKind ?? "place";
      if (mapPanel === "services") {
        if (kind !== "service") return false;
      } else if (kind === "service") {
        return false;
      }
      if (
        mapPanel !== "services" &&
        categorySet.size > 0 &&
        !categorySet.has((place.category || "").toLowerCase())
      ) {
        return false;
      }
      if (priceSet.size > 0) {
        const priceId = (place.priceBandId || place.priceBand || "").toLowerCase();
        if (!priceSet.has(priceId)) return false;
      }
      if (isOpenNow && !isPlaceOpenNow(place)) return false;
      if (hasEventToday && !hasEventTodayForPlace(place.id)) return false;
      if (within30Minutes && !isWithin10MinutesWalk(place)) return false;
      if (rainSafe && !isRainSafe(place)) return false;
      return true;
    });
  }, [
    placesData,
    servicePlaces,
    mapPanel,
    selectedCategories,
    selectedPriceBands,
    isOpenNow,
    hasEventToday,
    within30Minutes,
    rainSafe,
    userLocation,
    eventsData,
  ]);

  // Keep map markers aligned with list: places + showOnMap events (with coords)
  // on the unfiltered map — same merge rules as PlacesListView.
  const markers = useMemo(() => {
    const placeMarkers = (filteredPlaces || [])
      .filter(
        (place) => place.location && place.location.lat != null && place.location.lng != null
      )
      .map((place) => ({
        id: place.slug || place.id,
        lat: place.location!.lat!,
        lng: place.location!.lng!,
        name: place.name,
        category: place.category,
        mapImage: place.mapImage ?? null,
        heroImage: place.heroImage ?? null,
        onClick: place.slug
          ? () => {
              const path = buildUrl({
                lang,
                siteKey,
                path: placeEntityPath(lang, place.slug),
              });
              navigate(path);
            }
          : undefined,
      }));

    if (mapPanel === "services" || selectedCategories.length > 0) {
      return placeMarkers;
    }

    const now = Date.now();
    const eventMarkers =
      eventsData && Array.isArray(eventsData)
        ? eventsData
            .filter((event) => {
              if (event.showOnMap === false || !event.slug) return false;
              if (event.location?.lat == null || event.location?.lng == null) return false;
              const end = event.endDate ? new Date(event.endDate).getTime() : null;
              const start = new Date(event.startDate).getTime();
              if (end != null ? end < now : start < now - 24 * 60 * 60 * 1000) return false;
              return true;
            })
            .map((event) => ({
              id: `event-${event.slug}`,
              lat: event.location!.lat,
              lng: event.location!.lng,
              name: event.name,
              category: event.category,
              mapImage: null as string | null,
              heroImage: event.heroImage ?? null,
              onClick: () => {
                const path = buildUrl({
                  lang,
                  siteKey,
                  path: `event/${event.slug}`,
                });
                navigate(path);
              },
            }))
        : [];

    return [...placeMarkers, ...eventMarkers];
  }, [
    filteredPlaces,
    eventsData,
    mapPanel,
    selectedCategories,
    lang,
    siteKey,
    navigate,
  ]);

  // Initialize map center from settings (only once, or when settings change)
  // Use original placesData (not filtered) for center calculation
  const allPlacesWithCoordinates =
    placesData?.filter(
      (place) => place.location && place.location.lat != null && place.location.lng != null
    ) || [];

  useEffect(() => {
    hasInitializedCenter.current = false;
    initialPlacesLoaded.current = false;
    hasEverLoadedPlaces.current = false;
  }, [lang, siteKey]);

  // Track previous mapSettings values to detect actual changes
  const prevMapSettingsRef = useRef<{
    lat: number | null;
    lng: number | null;
    zoom: number | null;
  } | null>(null);
  // Initialize with null to detect initial mount
  const prevLangRef = useRef<string | null>(null);
  const prevSiteKeyRef = useRef<string | undefined>(undefined);

  // Update map center when mapSettings loads or changes (including on lang/tenant change)
  // This is the primary effect that should always run when mapSettings is available
  useEffect(() => {
    // Wait for mapSettings to load
    if (isLoadingMapSettings) {
      return;
    }

    // Check if lang or siteKey changed (force update even if mapSettings values are the same)
    // On initial mount, prevLangRef will be null, so we want to update
    const isInitialMount = prevLangRef.current === null;
    const langChanged = !isInitialMount && prevLangRef.current !== lang;
    const siteKeyChanged = !isInitialMount && prevSiteKeyRef.current !== siteKey;
    const mapSettingsChanged =
      prevMapSettingsRef.current === null ||
      prevMapSettingsRef.current.lat !== mapSettings?.lat ||
      prevMapSettingsRef.current.lng !== mapSettings?.lng ||
      prevMapSettingsRef.current.zoom !== mapSettings?.zoom;

    // Update refs
    if (isInitialMount || langChanged || siteKeyChanged) {
      prevLangRef.current = lang;
      prevSiteKeyRef.current = siteKey;
    }

    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      // Always update if mapSettings is available (including on initial load and lang/tenant change)
      // Force update if lang/tenant changed, or on initial mount, or if mapSettings changed, or if not initialized yet
      // Also check if current mapCenter doesn't match mapSettings (safety check)
      const currentCenterMatches =
        mapCenter &&
        Math.abs(mapCenter.lat - mapSettings.lat) < 0.0001 &&
        Math.abs(mapCenter.lng - mapSettings.lng) < 0.0001;

      if (
        isInitialMount ||
        langChanged ||
        siteKeyChanged ||
        mapSettingsChanged ||
        !hasInitializedCenter.current ||
        !currentCenterMatches
      ) {
        setMapCenter({ lat: mapSettings.lat, lng: mapSettings.lng, zoom: mapSettings.zoom ?? 13 });
        hasInitializedCenter.current = true;
        prevMapSettingsRef.current = {
          lat: mapSettings.lat,
          lng: mapSettings.lng,
          zoom: mapSettings.zoom ?? null,
        };
        return; // Exit early if we have map settings
      }
    }

    // Fallback: only use places center if we don't have map settings and haven't initialized yet
    if (
      !hasInitializedCenter.current &&
      !initialPlacesLoaded.current &&
      allPlacesWithCoordinates.length > 0 &&
      !isLoadingPlaces
    ) {
      const avgLat =
        allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) /
        allPlacesWithCoordinates.length;
      const avgLng =
        allPlacesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) /
        allPlacesWithCoordinates.length;
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
  }, [
    mapSettings,
    isLoadingPlaces,
    isLoadingMapSettings,
    allPlacesWithCoordinates.length,
    lang,
    siteKey,
    setMapCenter,
    dataUpdatedAt,
    mapCenter,
  ]);

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
    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);
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
        setMapCenter({ ...mapCenter, zoom: newZoom });
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

  // Show spinner while critical data is loading (map settings OR places)
  // This prevents showing empty page with just header/footer
  // Show spinner if:
  // 1. Map settings are loading
  // 2. Places are loading AND we've never loaded places data before (initial load only)
  // Don't show spinner when filters change - we have cached data and background refetch happens silently
  const isCriticalDataLoading =
    isLoadingMapSettings || (isLoadingPlaces && !hasEverLoadedPlaces.current);

  // Wait for platform settings before choosing opening page vs map/list,
  // so a filled landing does not flash the map while settings load.
  // Multi-town régió → public region index of települések (only when régió exists).
  // Single-settlement sites (Szeged) keep current landing / map behavior.
  if (!landingDismissed) {
    if (isLoadingPlatformSettings || isLoadingTowns) {
      return <PublicPageSkeleton withHero label={t("common.loading")} />;
    }
    const landing = readSiteLanding(platformSettings?.site);
    const isRegion = !!townsPayload?.isRegion && (townsPayload.towns?.length || 0) > 1;
    if (isRegion) {
      const selectTown = (town: PublicTown) => {
        openSiteExplore("list");
        navigate(
          buildUrl({ lang, siteKey: siteKey || "", path: townEntityPath(lang, town.slug) }),
          { replace: true }
        );
      };
      return (
        <RegionTownsIndex
          lang={lang}
          siteKey={siteKey || ""}
          regionName={platformSettings?.site?.name || platformSettings?.siteName || ""}
          landing={landing}
          towns={townsPayload!.towns}
          onSelectTown={selectTown}
        />
      );
    }
    if (landing) {
      return <SiteLanding lang={lang} siteKey={siteKey || ""} landing={landing} />;
    }
  }

  if (isCriticalDataLoading) {
    return (
      <div style={{ padding: "clamp(72px, 10vw, 96px) 16px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <PublicCardSkeletonGrid count={12} variant="places" label={t("common.loading")} />
      </div>
    );
  }

  // If we have an error loading places, show error state
  if (isPlacesError && !placesData) {
    return (
      <ErrorState
        title={t("error.errorOccurred")}
        message={t("public.errorLoadingPlaces")}
        variant="minimal"
      />
    );
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
                    height: "100vh",
                    position: "relative",
                    overflow: "hidden",
                    margin: 0,
                    padding: 0,
                    boxSizing: "border-box",
                  }
                : {
                    flex: 1,
                    minHeight: 0,
                    position: "relative",
                    overflow: "hidden",
                  }),
            }}
          >
            <Header />
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-busy="true"
                  aria-label={t("common.loading")}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 320,
                    background: "var(--hl-bg, #1b1730)",
                  }}
                />
              }
            >
              <MapComponent
                latitude={centerLat}
                longitude={centerLng}
                markers={markers}
                userLocation={userLocation || useFiltersStore.getState().userLocation}
                showRoutes={false}
                height={isMobile && typeof window !== "undefined" ? window.innerHeight : "100%"}
                interactive={true}
                defaultZoom={defaultZoom}
                mapStyle="default"
              />
            </Suspense>
            {/* Lista nézet gomb - same position as map view button in FloatingHeader */}
            <div
              style={{
                position: "absolute",
                top: isMobile ? 12 : 16,
                right: isMobile ? 12 : 48,
                zIndex: 1000,
                maxWidth: isMobile ? "calc(100% - 24px)" : undefined,
              }}
            >
              <button
                onClick={() => setShowMap(false)}
                style={{
                  padding: isMobile ? "10px 14px" : "8px 16px",
                  minHeight: 44,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#333",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                }}
              >
                📋 {t("public.listView")}
              </button>
            </div>
            <MapDock
              lang={lang}
              selectedCategories={selectedCategories}
              selectedPriceBands={selectedPriceBands}
              onPanelChange={setMapPanel}
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
          </div>
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
        </>
      )}
    </div>
  );
}

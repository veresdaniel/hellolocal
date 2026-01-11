import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { getPlaces } from "../api/places.api";
import { PlaceCard } from "../ui/place/PlaceCard";
import { useSeo } from "../seo/useSeo";
import { MapComponent } from "../components/MapComponent";
import { buildPath } from "../app/routing/buildPath";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { HAS_MULTIPLE_TENANTS } from "../app/config";
import { useFiltersStore } from "../stores/useFiltersStore";

export function ExplorePage() {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();
  const [showMap, setShowMap] = useState(true);
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;
  
  // Get user location from store
  const { userLocation, _hasHydrated, setUserLocation, showUserLocation } = useFiltersStore();
  
  // Get user location if available
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
  }, [_hasHydrated, userLocation, setUserLocation]);
  
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
  
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    
    // Don't request geolocation if showUserLocation is disabled
    if (!showUserLocation) {
      return;
    }
    
    // Check store state directly as fallback (don't wait for hydration if showUserLocation is enabled)
    const storeState = useFiltersStore.getState();
    const currentUserLocation = userLocation || storeState.userLocation;
    
    // If we already have a userLocation (from localStorage or store), use it and start watching
    if (currentUserLocation && typeof currentUserLocation.lat === "number" && typeof currentUserLocation.lng === "number") {
      // Only start watching if we're not already watching
      if (watchIdRef.current === null) {
        // Start watching for updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            // Geolocation watch error
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
    if (watchIdRef.current !== null || hasRequestedLocation.current) {
      return;
    }
    
    hasRequestedLocation.current = true;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        
        // Watch position for updates (especially useful on mobile)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            // Geolocation watch error
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000,
          }
        );
      },
      (error) => {
        // Geolocation error
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
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [_hasHydrated, userLocation, setUserLocation, showUserLocation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["places", lang, tenantKey],
    queryFn: () => getPlaces(lang, tenantKey),
  });

  useSeo({
    title: t("public.explore.title"),
    description: t("public.explore.description"),
  });

  if (isError)
    return (
      <div style={{ padding: 24 }}>
        <p>{t("public.errorLoadingPlaces")}</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(error)}</pre>
      </div>
    );

  const placesWithCoordinates = data?.filter((place) => place.location && place.location.lat != null && place.location.lng != null) || [];
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

  // Calculate center from places or default to Budapest
  const centerLat = placesWithCoordinates.length > 0
    ? placesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / placesWithCoordinates.length
    : 47.4979;
  const centerLng = placesWithCoordinates.length > 0
    ? placesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / placesWithCoordinates.length
    : 19.0402;

  return (
    <>
      <LoadingSpinner isLoading={isLoading} />
      <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {showMap ? (
        <>
          <MapComponent
            latitude={centerLat}
            longitude={centerLng}
            markers={markers}
            userLocation={userLocation || useFiltersStore.getState().userLocation}
            showRoutes={false}
            height={window.innerHeight}
            interactive={true}
            defaultZoom={placesWithCoordinates.length > 0 ? 12 : 13}
          />
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
                padding: "8px 16px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {t("public.listView")}
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: 24, height: "100vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1>{t("public.explore.title")}</h1>
            <button
              onClick={() => setShowMap(true)}
              style={{
                padding: "8px 16px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {t("public.mapView")}
            </button>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {data?.map((place) => (
              <PlaceCard key={place.slug} place={place} />
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

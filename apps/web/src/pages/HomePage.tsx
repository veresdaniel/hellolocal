// src/pages/HomePage.tsx
import { useState, useEffect, useMemo } from "react";
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

  const { data: placesData } = useQuery({
    queryKey: ["places", lang, selectedCategories, selectedPriceBands],
    queryFn: () => getPlaces(
      lang,
      selectedCategories.length > 0 ? selectedCategories[0] : undefined,
      selectedPriceBands.length > 0 ? selectedPriceBands[0] : undefined
    ),
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

  // Calculate initial center and zoom from map settings, places, or defaults
  const { centerLat, centerLng, defaultZoom } = useMemo(() => {
    // Priority: 1. Map settings, 2. Places center, 3. Default (Budapest)
    if (mapSettings?.lat != null && mapSettings?.lng != null) {
      return {
        centerLat: mapSettings.lat,
        centerLng: mapSettings.lng,
        defaultZoom: mapSettings.zoom ?? (placesWithCoordinates.length > 0 ? 12 : 13),
      };
    }

    if (placesWithCoordinates.length > 0) {
      return {
        centerLat: placesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) / placesWithCoordinates.length,
        centerLng: placesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) / placesWithCoordinates.length,
        defaultZoom: mapSettings?.zoom ?? 12,
      };
    }

    return {
      centerLat: 47.4979, // Budapest default
      centerLng: 19.0402,
      defaultZoom: mapSettings?.zoom ?? 13,
    };
  }, [mapSettings, placesWithCoordinates]);

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
            <MapFilters
              selectedCategories={selectedCategories}
              selectedPriceBands={selectedPriceBands}
              onCategoriesChange={setSelectedCategories}
              onPriceBandsChange={setSelectedPriceBands}
              lang={lang}
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

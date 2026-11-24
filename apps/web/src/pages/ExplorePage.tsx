import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlaces, getPlatformSettings } from "../api/places.api";
import { PlaceCard } from "../ui/place/PlaceCard";
import { useSeo } from "../seo/useSeo";
import { absoluteCanonical } from "../seo/canonical";
import { robotsDirective } from "../seo/schemaOrg";
import { buildUrl } from "../app/urls";
import { placeEntityPath } from "../app/entityPaths";
import { useRouteCtx } from "../app/useRouteCtx";
import { useNavigate } from "react-router-dom";
import { useFiltersStore } from "../stores/useFiltersStore";
import { usePublishedLanguages } from "../hooks/useContentLanguages";

const MapComponent = lazy(() =>
  import("../components/MapComponent").then((m) => ({ default: m.MapComponent }))
);

export function ExplorePage() {
  const { t } = useTranslation();
  const { lang, siteKey } = useRouteCtx();
  const navigate = useNavigate();
  const [showMap, setShowMap] = useState(true);

  // GPS pin + live updates: MapComponent / useLiveUserGeolocation
  const { userLocation, _hasHydrated, setUserLocation, showUserLocation } = useFiltersStore();

  useEffect(() => {
    if (!_hasHydrated) {
      try {
        const stored = localStorage.getItem("home-filters-storage");
        if (stored) {
          const timeoutId = setTimeout(() => {
            const storeState = useFiltersStore.getState();
            if (!storeState._hasHydrated) {
              storeState.setHasHydrated(true);
            }
          }, 50);
          return () => clearTimeout(timeoutId);
        }
      } catch {
        // ignore
      }
    }
  }, [_hasHydrated]);

  // Clear pin when the user turns location off (live watch stops in MapComponent).
  useEffect(() => {
    if (!showUserLocation) {
      setUserLocation(null);
    }
  }, [showUserLocation, setUserLocation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["places", lang, siteKey],
    queryFn: () => getPlaces(lang, siteKey),
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, siteKey],
    queryFn: () => getPlatformSettings(lang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  const languages = usePublishedLanguages();
  const exploreTitle =
    platformSettings?.seoTitle?.trim() ||
    platformSettings?.site?.name ||
    t("public.explore.title");
  const exploreDescription =
    platformSettings?.seoDescription?.trim() ||
    platformSettings?.site?.shortDescription ||
    t("public.explore.description");
  const exploreCanonical = absoluteCanonical();
  const exploreSeo = useMemo(
    () => ({
      title: exploreTitle,
      description: exploreDescription,
      canonical: exploreCanonical,
      robots: robotsDirective(platformSettings?.isCrawlable),
      image: platformSettings?.defaultPlaceholderCardImage || undefined,
      og: {
        type: "website" as const,
        title: exploreTitle,
        description: exploreDescription,
        image: platformSettings?.defaultPlaceholderCardImage || undefined,
      },
      twitter: {
        card: (platformSettings?.defaultPlaceholderCardImage
          ? "summary_large_image"
          : "summary") as "summary_large_image" | "summary",
        title: exploreTitle,
        description: exploreDescription,
        image: platformSettings?.defaultPlaceholderCardImage || undefined,
      },
      schemaOrg: {
        type: "WebPage" as const,
        data: {
          name: exploreTitle,
          description: exploreDescription,
          url: exploreCanonical,
          inLanguage: lang,
          isPartOf: platformSettings?.siteName
            ? { name: platformSettings.siteName, url: window.location.origin }
            : undefined,
        },
      },
    }),
    [
      exploreTitle,
      exploreDescription,
      exploreCanonical,
      platformSettings?.isCrawlable,
      platformSettings?.defaultPlaceholderCardImage,
      platformSettings?.siteName,
      lang,
    ]
  );
  useSeo(exploreSeo, {
    siteName: platformSettings?.siteName,
    languages,
    lang,
  });

  if (isError)
    return (
      <div style={{ padding: 24 }}>
        <p>{t("public.errorLoadingPlaces")}</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(error)}</pre>
      </div>
    );

  const placesWithCoordinates =
    data?.filter(
      (place) => place.location && place.location.lat != null && place.location.lng != null
    ) || [];
  const markers = placesWithCoordinates.map((place) => ({
    id: place.slug || place.id, // Use slug if available, otherwise use ID
    lat: place.location!.lat!,
    lng: place.location!.lng!,
    name: place.name,
    category: place.category,
    mapImage: place.mapImage ?? null,
    cardImage: place.cardImage ?? null,
    heroImage: place.heroImage ?? null,
    onClick: place.slug
      ? () => {
          const path = buildUrl({ lang, siteKey, path: placeEntityPath(lang, place.slug) });
          navigate(path);
        }
      : undefined, // Only allow navigation if slug exists
  }));

  // Calculate center from places or default to Budapest
  const centerLat =
    placesWithCoordinates.length > 0
      ? placesWithCoordinates.reduce((sum, p) => sum + p.location!.lat!, 0) /
        placesWithCoordinates.length
      : 47.4979;
  const centerLng =
    placesWithCoordinates.length > 0
      ? placesWithCoordinates.reduce((sum, p) => sum + p.location!.lng!, 0) /
        placesWithCoordinates.length
      : 19.0402;

  // Map is the default surface — reserve the viewport instead of a content
  // sheet that collapses when the map mounts (large CLS).
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={t("common.loading")}
        style={{
          width: "100%",
          height: "100vh",
          minHeight: 320,
          background: "var(--hl-bg, #1b1730)",
        }}
      >
        <span className="hl-visually-hidden">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
        {showMap ? (
          <>
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-busy="true"
                  aria-label={t("common.loading")}
                  style={{ width: "100%", height: "100%", background: "var(--hl-bg, #1b1730)" }}
                >
                  <span className="hl-visually-hidden">{t("common.loading")}</span>
                </div>
              }
            >
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
            </Suspense>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
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
            <div className="places-grid" style={{ display: "grid", gap: 16, minHeight: 280 }}>
              {data?.map((place) => (
                <PlaceCard key={place.slug || place.id} place={place} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

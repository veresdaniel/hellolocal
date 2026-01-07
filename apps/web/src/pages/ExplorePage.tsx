import { useState } from "react";
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

export function ExplorePage() {
  const { t } = useTranslation();
  const { lang, tenantSlug } = useTenantContext();
  const navigate = useNavigate();
  const [showMap, setShowMap] = useState(true);
  const tenantKey = HAS_MULTIPLE_TENANTS ? tenantSlug : undefined;

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
      navigate(buildPath({ tenantSlug, lang, path: `place/${place.slug}` }));
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

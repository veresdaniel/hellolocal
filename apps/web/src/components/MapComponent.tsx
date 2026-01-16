// MapComponent.hardened.tsx
// Hardened MapComponent – stable markers, safe geolocation toggle, no ghost clicks
// See previous explanation in chat for rationale.

// NOTE: This file is intentionally self-contained and defensive.
// Drop-in replacement for your existing MapComponent.tsx

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Map as ReactMapGl, Marker, Source, Layer } from "react-map-gl";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAX_DISTANCE_KM } from "../app/config";
import { useFiltersStore } from "../stores/useFiltersStore";

interface MapComponentProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    name?: string;
    onClick?: () => void;
  }>;
  height?: number | string;
  interactive?: boolean;
  defaultZoom?: number;
  hideLocationButton?: boolean;
}

const hasNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const ZOOM_CLOSE_THRESHOLD = 13;
type ZoomLevel = "close" | "far";
const getZoomLevel = (z: number): ZoomLevel =>
  z >= ZOOM_CLOSE_THRESHOLD ? "close" : "far";

export function MapComponent({
  latitude,
  longitude,
  onLocationChange,
  onZoomChange,
  markers = [],
  height = 400,
  interactive = true,
  defaultZoom = 13,
  hideLocationButton = false,
}: MapComponentProps) {
  const { t } = useTranslation();
  const { showUserLocation, setShowUserLocation, userLocation, setUserLocation } =
    useFiltersStore();

  const [viewState, setViewState] = useState({
    latitude: hasNumber(latitude) ? latitude : 47.4979,
    longitude: hasNumber(longitude) ? longitude : 19.0402,
    zoom: defaultZoom,
  });

  const selectedMarkerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasNumber(latitude) && hasNumber(longitude)) {
      setViewState((v) => ({
        ...v,
        latitude,
        longitude,
      }));
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      if (!interactive || !onLocationChange) return;
      onLocationChange(e.lngLat.lat, e.lngLat.lng);
    },
    [interactive, onLocationChange],
  );

  const handleMarkerClick = useCallback(
    (markerId: string, onClick?: () => void) => {
      if (!showUserLocation) {
        onClick?.();
        return;
      }

      if (selectedMarkerIdRef.current === markerId) {
        onClick?.();
      } else {
        selectedMarkerIdRef.current = markerId;
      }
    },
    [showUserLocation],
  );

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div style={{ width: "100%", height: heightStyle, position: "relative" }}>
      <ReactMapGl
        {...viewState}
        onMove={(e) => {
          setViewState(e.viewState);
          onZoomChange?.(e.viewState.zoom);
        }}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        mapLib={maplibregl as any}
        dragRotate={false}
      >
        {markers.map((m) => {
          if (!hasNumber(m.lat) || !hasNumber(m.lng)) return null;

          const zoomLevel = getZoomLevel(viewState.zoom);
          const isSelected = selectedMarkerIdRef.current === m.id;

          return (
            <Marker key={m.id} latitude={m.lat} longitude={m.lng}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(m.id, m.onClick);
                }}
                style={{
                  width: zoomLevel === "close" ? 24 : 12,
                  height: zoomLevel === "close" ? 24 : 12,
                  borderRadius: "50%",
                  background: isSelected ? "#fbbf24" : "#667eea",
                  border: "2px solid white",
                  cursor: "pointer",
                }}
              />
            </Marker>
          );
        })}
      </ReactMapGl>

      {!hideLocationButton && (
        <button
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            zIndex: 10,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#667eea",
            color: "white",
            border: "none",
          }}
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setUserLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
                setShowUserLocation(true);
              },
              () => {
                setShowUserLocation(false);
              },
            );
          }}
        >
          {t("public.showMyLocation")}
        </button>
      )}
    </div>
  );
}

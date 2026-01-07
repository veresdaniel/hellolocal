// src/components/MapComponent.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Map, { Marker } from "react-map-gl";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  height?: number;
  interactive?: boolean;
  defaultZoom?: number;
  mapStyle?: "default" | "hand-drawn" | "pastel";
}

export function MapComponent({
  latitude,
  longitude,
  onLocationChange,
  onZoomChange,
  markers = [],
  height = 400,
  interactive = true,
  defaultZoom = 13,
  mapStyle = "default",
}: MapComponentProps) {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState({
    longitude: longitude ?? 19.0402, // Default: Budapest
    latitude: latitude ?? 47.4979,
    zoom: defaultZoom,
  });

  const isDraggingRef = useRef(false);
  const prevLatRef = useRef<number | null>(latitude);
  const prevLngRef = useRef<number | null>(longitude);

  // Update view state when latitude/longitude props change (from input fields)
  // Only update if the values are significantly different to avoid jumping during drag
  useEffect(() => {
    if (isDraggingRef.current) {
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      return; // Don't update during drag
    }
    
    if (latitude != null && longitude != null) {
      const prevLat = prevLatRef.current;
      const prevLng = prevLngRef.current;
      
      if (prevLat != null && prevLng != null) {
        const latDiff = Math.abs(latitude - prevLat);
        const lngDiff = Math.abs(longitude - prevLng);
        // Only update if difference is significant (more than 0.0001 degrees, ~11 meters)
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          // Use setTimeout to avoid synchronous setState in effect
          setTimeout(() => {
            setViewState((prev) => ({
              ...prev,
              latitude,
              longitude,
            }));
          }, 0);
        }
      } else {
        // First time setting coordinates
        setTimeout(() => {
          setViewState((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
        }, 0);
      }
      
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
    } else if (latitude == null && longitude == null && (prevLatRef.current != null || prevLngRef.current != null)) {
      // Reset to default if both are null and they weren't null before
      setTimeout(() => {
        setViewState((prev) => ({
          ...prev,
          latitude: 47.4979,
          longitude: 19.0402,
        }));
      }, 0);
      prevLatRef.current = null;
      prevLngRef.current = null;
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      if (!interactive || !onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
      // Update viewState to center on clicked location
      setViewState((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
      }));
    },
    [interactive, onLocationChange],
  );

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      isDraggingRef.current = false;
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      // Only update the callback, don't update viewState here
      // The viewState is already updated by the drag operation
      onLocationChange(lat, lng);
    },
    [onLocationChange],
  );

  // Use props if available, otherwise use viewState (for initial load)
  // But only update from props if they're different from current viewState
  // to avoid jumping during drag operations
  const currentLat = latitude != null ? latitude : viewState.latitude;
  const currentLng = longitude != null ? longitude : viewState.longitude;

  return (
    <div style={{ width: "100%", height, position: "relative", overflow: "hidden" }}>
      <Map
        {...viewState}
        onMove={(evt) => {
          setViewState(evt.viewState);
          if (onZoomChange) {
            onZoomChange(evt.viewState.zoom);
          }
        }}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapLib={maplibregl as any}
        mapStyle={
          mapStyle === "hand-drawn"
            ? {
                version: 8,
                sources: {
                  "hand-drawn-tiles": {
                    type: "raster",
                    tiles: [
                      "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
                    ],
                    tileSize: 256,
                    attribution: "© Stamen Design, © OpenStreetMap contributors"
                  }
                },
                layers: [
                  {
                    id: "hand-drawn-layer",
                    type: "raster",
                    source: "hand-drawn-tiles",
                    minzoom: 0,
                    maxzoom: 18
                  }
                ]
              }
            : mapStyle === "pastel"
            ? {
                version: 8,
                sources: {
                  "pastel-tiles": {
                    type: "raster",
                    tiles: [
                      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    ],
                    tileSize: 256,
                    attribution: "© OpenStreetMap contributors"
                  }
                },
                layers: [
                  {
                    id: "pastel-layer",
                    type: "raster",
                    source: "pastel-tiles",
                    minzoom: 0,
                    maxzoom: 22,
                    paint: {
                      "raster-saturation": -0.3
                    }
                  }
                ]
              }
            : {
                version: 8,
                sources: {
                  "raster-tiles": {
                    type: "raster",
                    tiles: [
                      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    ],
                    tileSize: 256,
                    attribution: "© OpenStreetMap contributors"
                  }
                },
                layers: [
                  {
                    id: "simple-tiles",
                    type: "raster",
                    source: "raster-tiles",
                    minzoom: 0,
                    maxzoom: 22,
                    paint: {
                      "raster-saturation": -0.3
                    }
                  }
                ]
              }
        }
        cursor={interactive && onLocationChange ? "crosshair" : "default"}
        dragRotate={false}
        touchZoomRotate={false}
      >
        {/* Main marker (editable location) */}
        {currentLat && currentLng && onLocationChange && (
          <Marker
            longitude={currentLng}
            latitude={currentLat}
            draggable={interactive}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50% 50% 50% 0",
                background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                border: "3px solid white",
                boxShadow: "0 4px 12px rgba(0, 123, 255, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
                cursor: interactive && !!onLocationChange ? "move" : "default",
                transform: "rotate(-45deg)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Inner dot */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "white",
                }}
              />
            </div>
          </Marker>
        )}

        {/* Additional markers (for places on explore page) */}
        {markers.map((marker) => {
          // Show labels only when zoomed in (zoom >= 13)
          const showLabel = viewState.zoom >= 13 && marker.name;
          
          return (
            <Marker
              key={marker.id}
              longitude={marker.lng}
              latitude={marker.lat}
              onClick={marker.onClick}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Modern marker pin design */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50% 50% 50% 0",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "3px solid white",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
                    cursor: marker.onClick ? "pointer" : "default",
                    transform: "rotate(-45deg)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (marker.onClick) {
                      e.currentTarget.style.transform = "rotate(-45deg) scale(1.15)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "rotate(-45deg) scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  {/* Inner dot */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "white",
                    }}
                  />
                </div>
                
                {/* Label - only shown when zoomed in */}
                {showLabel && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      padding: "6px 12px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)",
                      marginBottom: 8,
                      pointerEvents: "none",
                      color: "#1a1a1a",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {marker.name}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>
      {interactive && onLocationChange && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "white",
            padding: "8px 12px",
            borderRadius: 4,
            fontSize: 12,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          {t("admin.clickOrDragMarker")}
        </div>
      )}
    </div>
  );
}


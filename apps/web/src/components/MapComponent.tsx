// src/components/MapComponent.tsx
// Rebuilt + hardened (full-feature) MapComponent
// Goals:
// - Restore ALL features: markers, labels, selectable marker, route + distance + walking/cycling time, draggable geolocation toggle
// - Fix mobile "tap opens immediately" by removing ghost-click issues:
//   - Use Pointer Events for marker interactions (onPointerUp) and do NOT use onTouchEnd.
//   - This works for both mouse and touch.
// - Prevent geolocation toggle from disappearing: clamp + validate persisted position.
// - Defensive checks for 0 coords (don't use truthy checks).

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
    distance?: number; // Distance in km from user location
    walkingTime?: number; // Walking time in minutes
    cyclingTime?: number; // Cycling time in minutes
    isRouteDistance?: boolean; // Whether distance is based on route
  }>;
  userLocation?: { lat: number; lng: number } | null;
  showRoutes?: boolean;
  height?: number | string;
  interactive?: boolean;
  defaultZoom?: number;
  mapStyle?: "default" | "hand-drawn" | "pastel";
  hideLocationButton?: boolean;
}

// ---------- small utils ----------
const hasNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const METERS_PER_KM = 1000;
const DISTANCE_THRESHOLD_KM = 1;
const formatDistance = (distance: number): string => {
  if (distance < DISTANCE_THRESHOLD_KM) return `${Math.round(distance * METERS_PER_KM)} m`;
  return `${distance.toFixed(1)} km`;
};

const WALKING_SPEED_KMH = 5;
const CYCLING_SPEED_KMH = 15;
const MINUTES_PER_HOUR = 60;

const calculateWalkingTime = (distanceKm: number): number => (distanceKm / WALKING_SPEED_KMH) * MINUTES_PER_HOUR;
const calculateCyclingTime = (distanceKm: number): number => (distanceKm / CYCLING_SPEED_KMH) * MINUTES_PER_HOUR;

const formatWalkingTime = (minutes: number, t: (key: string) => string): string => {
  if (minutes < 1) return `< 1 ${t("public.minute")}`;
  if (minutes < 60) {
    const m = Math.round(minutes);
    return `${m} ${m === 1 ? t("public.minute") : t("public.minutes")}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} ${hours === 1 ? t("public.hour") : t("public.hours")}`;
  return `${hours} ${hours === 1 ? t("public.hour") : t("public.hours")} ${mins} ${mins === 1 ? t("public.minute") : t("public.minutes")}`;
};

const ZOOM_CLOSE_THRESHOLD = 13;
const ZOOM_MEDIUM_THRESHOLD = 10;
const ZOOM_FAR_THRESHOLD = 7;

type ZoomLevel = "close" | "medium" | "far" | "veryFar";
const getZoomLevel = (zoom: number): ZoomLevel => {
  if (zoom >= ZOOM_CLOSE_THRESHOLD) return "close";
  if (zoom >= ZOOM_MEDIUM_THRESHOLD) return "medium";
  if (zoom >= ZOOM_FAR_THRESHOLD) return "far";
  return "veryFar";
};

// simple clustering at veryFar
function clusterMarkers<T extends { lat: number; lng: number }>(markers: T[], zoom: number): T[] {
  if (getZoomLevel(zoom) !== "veryFar") return markers;
  const cellSize = 0.1;
  const cellMap = new Map<string, T>();
  for (const marker of markers) {
    const cellLat = Math.floor(marker.lat / cellSize);
    const cellLng = Math.floor(marker.lng / cellSize);
    const key = `${cellLat},${cellLng}`;
    if (!cellMap.has(key)) cellMap.set(key, marker);
  }
  return Array.from(cellMap.values());
}

// clamp draggable control position
const LOCATION_CONTROL_MAX_WIDTH = 200;
function clampPosition(pos: { bottom: number; left: number }, viewport: { w: number; h: number }) {
  const bottom = Number.isFinite(pos.bottom) ? pos.bottom : 0;
  const left = Number.isFinite(pos.left) ? pos.left : 0;
  return {
    bottom: Math.max(0, Math.min(viewport.h - 50, bottom)),
    left: Math.max(0, Math.min(viewport.w - LOCATION_CONTROL_MAX_WIDTH, left)),
  };
}

function safeParsePosition(raw: string | null): { bottom: number; left: number } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.bottom !== "number" || typeof v?.left !== "number") return null;
    return v;
  } catch {
    return null;
  }
}

// ---------- component ----------
export function MapComponent({
  latitude,
  longitude,
  onLocationChange,
  onZoomChange,
  markers = [],
  userLocation: userLocationProp = null,
  showRoutes = true,
  height = 400,
  interactive = true,
  defaultZoom = 13,
  mapStyle = "default",
  hideLocationButton = false,
}: MapComponentProps) {
  const { t } = useTranslation();
  const { showUserLocation, setShowUserLocation, userLocation: userLocationFromStore, setUserLocation } = useFiltersStore();
  const userLocation = userLocationFromStore || userLocationProp;

  // geolocation watch
  const watchIdRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // routes
  const [routes, setRoutes] = useState<Array<{ coordinates: number[][]; markerId: string; distance?: number; duration?: number }>>([]);
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());
  const loadingRoutesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    loadingRoutesRef.current = loadingRoutes;
  }, [loadingRoutes]);

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

  // default positions per device
  const defaultPositionDesktop = { bottom: 100, left: 16 };
  const defaultPositionMobile = { bottom: 80, left: 12 };

  const getDefaultPos = () => (isDesktop ? defaultPositionDesktop : defaultPositionMobile);

  // draggable location control position (persisted)
  const [locationControlPosition, setLocationControlPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = safeParsePosition(localStorage.getItem(`mapLocationControlPosition_${deviceKey}`));
    const base = saved ?? getDefaultPos();
    return clampPosition(base, { w: window.innerWidth, h: window.innerHeight });
  });

  // load when device type changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = safeParsePosition(localStorage.getItem(`mapLocationControlPosition_${deviceKey}`));
    const base = saved ?? getDefaultPos();
    setLocationControlPosition(clampPosition(base, { w: window.innerWidth, h: window.innerHeight }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  // clamp on resize
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setLocationControlPosition((pos) => clampPosition(pos, { w: window.innerWidth, h: window.innerHeight }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // persist (only if moved)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = getDefaultPos();
    const clamped = clampPosition(locationControlPosition, { w: window.innerWidth, h: window.innerHeight });

    if (clamped.bottom !== defaultPos.bottom || clamped.left !== defaultPos.left) {
      localStorage.setItem(`mapLocationControlPosition_${deviceKey}`, JSON.stringify(clamped));
    } else {
      localStorage.removeItem(`mapLocationControlPosition_${deviceKey}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationControlPosition, isDesktop]);

  // dragging state for location control
  const DRAG_RESET_DELAY_MS = 100;
  const [isDraggingLocationControl, setIsDraggingLocationControl] = useState(false);
  const [hasDraggedLocationControl, setHasDraggedLocationControl] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const locationControlRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleLocationControlMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !locationControlRef.current) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") return;

    e.preventDefault();
    setHasDraggedLocationControl(false);

    const rect = locationControlRef.current.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDraggingLocationControl(true);
  };

  const handleLocationControlTouchStart = (e: React.TouchEvent) => {
    if (!locationControlRef.current) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") return;

    e.preventDefault();
    setHasDraggedLocationControl(false);

    const touch = e.touches[0];
    const rect = locationControlRef.current.getBoundingClientRect();
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setIsDraggingLocationControl(true);
  };

  useEffect(() => {
    if (!isDraggingLocationControl) return;

    const handleMouseMove = (e: MouseEvent) => {
      const moved = Math.abs(e.clientX - dragStartRef.current.x) > 5 || Math.abs(e.clientY - dragStartRef.current.y) > 5;
      if (moved) setHasDraggedLocationControl(true);

      if (!locationControlRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const elementHeight = locationControlRef.current.offsetHeight || 50;
      const newBottom = window.innerHeight - newY - elementHeight;

      setLocationControlPosition(clampPosition({ bottom: newBottom, left: newX }, { w: window.innerWidth, h: window.innerHeight }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];

      const moved = Math.abs(touch.clientX - dragStartRef.current.x) > 5 || Math.abs(touch.clientY - dragStartRef.current.y) > 5;
      if (moved) setHasDraggedLocationControl(true);

      if (!locationControlRef.current) return;

      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      const elementHeight = locationControlRef.current.offsetHeight || 50;
      const newBottom = window.innerHeight - newY - elementHeight;

      setLocationControlPosition(clampPosition({ bottom: newBottom, left: newX }, { w: window.innerWidth, h: window.innerHeight }));
    };

    const endDrag = () => {
      setIsDraggingLocationControl(false);
      setTimeout(() => setHasDraggedLocationControl(false), DRAG_RESET_DELAY_MS);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", endDrag);
    };
  }, [isDraggingLocationControl, dragOffset]);

  // view state
  const [viewState, setViewState] = useState(() => ({
    longitude: hasNumber(longitude) ? longitude : 19.0402,
    latitude: hasNumber(latitude) ? latitude : 47.4979,
    zoom: defaultZoom,
  }));

  // keep center in sync with props (avoid truthy checks)
  const isDraggingRef = useRef(false);
  const prevLatRef = useRef<number | null>(latitude);
  const prevLngRef = useRef<number | null>(longitude);

  useEffect(() => {
    if (isDraggingRef.current) {
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      return;
    }

    if (hasNumber(latitude) && hasNumber(longitude)) {
      const prevLat = prevLatRef.current;
      const prevLng = prevLngRef.current;

      const shouldUpdate =
        !hasNumber(prevLat) ||
        !hasNumber(prevLng) ||
        Math.abs(latitude - prevLat) > 0.0001 ||
        Math.abs(longitude - prevLng) > 0.0001;

      if (shouldUpdate) {
        setViewState((prev) => ({ ...prev, latitude, longitude, zoom: defaultZoom }));
      }

      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
    }
  }, [latitude, longitude, defaultZoom]);

  // map click
  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      if (selectedMarkerId) setSelectedMarkerId(null);

      if (!interactive || !onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
      setViewState((prev) => ({ ...prev, longitude: lng, latitude: lat }));
    },
    [interactive, onLocationChange, selectedMarkerId],
  );

  // main marker drag
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDrag = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
    },
    [onLocationChange],
  );

  const handleDragEnd = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      isDraggingRef.current = false;
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
    },
    [onLocationChange],
  );

  const currentLat = hasNumber(latitude) ? latitude : viewState.latitude;
  const currentLng = hasNumber(longitude) ? longitude : viewState.longitude;

  // OSRM route fetch
  const fetchRoute = useCallback(
    async (markerLat: number, markerLng: number, markerId: string) => {
      if (!userLocation) return;

      setLoadingRoutes((prev) => new Set(prev).add(markerId));

      try {
        const start = `${userLocation.lng},${userLocation.lat}`;
        const end = `${markerLng},${markerLat}`;
        const profile = "driving";

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson`,
        );

        if (!response.ok) {
          console.warn(`OSRM API failed for marker ${markerId}:`, response.status, response.statusText);
          setRoutes((prev) => prev.filter((r) => r.markerId !== markerId));
          return;
        }

        const data = await response.json();
        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
          const coordinates = data.routes[0].geometry.coordinates as number[][];
          const distance = data.routes[0].distance / 1000;
          const walkingDuration = calculateWalkingTime(distance);

          setRoutes((prev) => {
            const filtered = prev.filter((r) => r.markerId !== markerId);
            return [...filtered, { coordinates, markerId, distance, duration: walkingDuration }];
          });
        } else {
          setRoutes((prev) => prev.filter((r) => r.markerId !== markerId));
        }
      } catch (err) {
        console.warn(`Failed to fetch route for marker ${markerId}:`, err);
        setRoutes((prev) => prev.filter((r) => r.markerId !== markerId));
      } finally {
        setLoadingRoutes((prev) => {
          const next = new Set(prev);
          next.delete(markerId);
          return next;
        });
      }
    },
    [userLocation],
  );

  const fetchRouteRef = useRef(fetchRoute);
  useEffect(() => {
    fetchRouteRef.current = fetchRoute;
  }, [fetchRoute]);

  const lastRouteFetchPosition = useRef<{ lat: number; lng: number; markerId: string } | null>(null);
  const shouldHaveRoutesRef = useRef(false);

  // update route for selected marker when user moves significantly
  useEffect(() => {
    if (!showRoutes) return;

    if (showUserLocation && selectedMarkerId && userLocation && hasNumber(userLocation.lat) && hasNumber(userLocation.lng)) {
      const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
      if (selectedMarker && hasNumber(selectedMarker.lat) && hasNumber(selectedMarker.lng)) {
        const isLoading = loadingRoutesRef.current.has(selectedMarkerId);

        const last = lastRouteFetchPosition.current;
        const shouldUpdate =
          !last ||
          last.markerId !== selectedMarkerId ||
          Math.abs(last.lat - userLocation.lat) > 0.0005 ||
          Math.abs(last.lng - userLocation.lng) > 0.0005;

        if (!isLoading && shouldUpdate) {
          lastRouteFetchPosition.current = { lat: userLocation.lat, lng: userLocation.lng, markerId: selectedMarkerId };
          fetchRouteRef.current(selectedMarker.lat, selectedMarker.lng, selectedMarkerId);
        }
        shouldHaveRoutesRef.current = true;
      }
    } else {
      if (shouldHaveRoutesRef.current) {
        setRoutes([]);
        shouldHaveRoutesRef.current = false;
      }
      lastRouteFetchPosition.current = null;
    }
  }, [showRoutes, selectedMarkerId, userLocation, markers, showUserLocation]);

  // clear selection if marker disappears
  useEffect(() => {
    if (!selectedMarkerId) return;
    if (!markers.some((m) => m.id === selectedMarkerId)) {
      setSelectedMarkerId(null);
      setRoutes([]);
      lastRouteFetchPosition.current = null;
    }
  }, [markers, selectedMarkerId]);

  // auto-disable geo on zoom out
  useEffect(() => {
    const zl = getZoomLevel(viewState.zoom);
    if ((zl === "medium" || zl === "far" || zl === "veryFar") && showUserLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setShowUserLocation(false);
      setUserLocation(null);
      setSelectedMarkerId(null);
      setRoutes([]);
      lastRouteFetchPosition.current = null;
    }
  }, [viewState.zoom, showUserLocation, setShowUserLocation, setUserLocation]);

  // enrich markers with route distance ONLY for selected marker
  const markersWithDistance = useMemo(() => {
    const base = Array.isArray(markers) ? markers : [];
    if (!showUserLocation || !userLocation) return base;

    return base.map((marker) => {
      const route = selectedMarkerId === marker.id ? routes.find((r) => r.markerId === marker.id) : null;
      const distance = route?.distance;
      const walkingTime = route?.duration;
      const cyclingTime = distance !== undefined ? calculateCyclingTime(distance) : undefined;

      return {
        ...marker,
        distance,
        walkingTime,
        cyclingTime,
        isRouteDistance: !!route?.distance,
      };
    });
  }, [markers, userLocation, routes, selectedMarkerId, showUserLocation]);

  const visibleMarkers = useMemo(() => clusterMarkers(markersWithDistance, viewState.zoom), [markersWithDistance, viewState.zoom]);

  // Pointer-based marker interaction: works for mouse + touch without ghost clicks
  const handleMarkerPointerUp = useCallback(
    (marker: (typeof markersWithDistance)[0], e: React.PointerEvent) => {
      e.stopPropagation();

      // if geo is off: navigate on first interaction
      if (!showUserLocation) {
        marker.onClick?.();
        return;
      }

      // geo on: 2-step interaction
      if (selectedMarkerId === marker.id) {
        marker.onClick?.();
      } else {
        setRoutes([]); // clear old route
        lastRouteFetchPosition.current = null;
        setSelectedMarkerId(marker.id);
      }
    },
    [selectedMarkerId, showUserLocation],
  );

  // map style
  const memoizedMapStyle = useMemo(() => {
    if (mapStyle === "hand-drawn") {
      return {
        version: 8,
        sources: {
          "hand-drawn-tiles": {
            type: "raster",
            tiles: ["https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"],
            tileSize: 256,
            attribution: "© Stamen Design, © OpenStreetMap contributors",
          },
        },
        layers: [{ id: "hand-drawn-layer", type: "raster", source: "hand-drawn-tiles", minzoom: 0, maxzoom: 18 }],
      };
    }
    if (mapStyle === "pastel") {
      return {
        version: 8,
        sources: {
          "pastel-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "pastel-layer", type: "raster", source: "pastel-tiles", minzoom: 0, maxzoom: 22, paint: { "raster-saturation": -0.3 } }],
      };
    }
    return {
      version: 8,
      sources: {
        "raster-tiles": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "simple-tiles", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 22, paint: { "raster-saturation": -0.3 } }],
    };
  }, [mapStyle]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div style={{ width: "100%", height: heightStyle, position: "relative", overflow: "hidden", margin: 0, padding: 0 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.4); }
        }
        @keyframes personPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>

      <ReactMapGl
        {...viewState}
        onMove={(evt) => {
          setViewState(evt.viewState);
          onZoomChange?.(evt.viewState.zoom);
        }}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapLib={maplibregl as any}
        mapStyle={memoizedMapStyle as any}
        cursor={interactive && onLocationChange ? "crosshair" : "default"}
        dragRotate={false}
        touchZoomRotate={true}
        touchPitch={false}
        dragPan={true}
        onLoad={(evt) => {
          const map = evt.target;
          if (map?.scrollZoom) map.scrollZoom.setWheelZoomRate(1 / 800);
        }}
      >
        {/* User location marker */}
        {showUserLocation && userLocation && hasNumber(userLocation.lat) && hasNumber(userLocation.lng) && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
            <div style={{ position: "relative", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div
                style={{
                  position: "absolute",
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "rgba(102, 126, 234, 0.2)",
                  animation: "pulse 2s infinite",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: "50%",
                  background: "#fbbf24",
                  border: "4px solid white",
                  boxShadow: "0 4px 12px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1001,
                  animation: "personPulse 2s ease-in-out infinite",
                }}
              >
                👤
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "32.5%",
                  left: "50%",
                  transform: "translate(calc(-50% + 17.5px), -100%)",
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.98) 0%, rgba(245, 158, 11, 0.98) 100%)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  padding: "6px 14px",
                  borderRadius: 12,
                  fontSize: "clamp(13px, 3vw, 15px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(251, 191, 36, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                  pointerEvents: "none",
                  color: "#1f2937",
                  border: "1.5px solid rgba(255, 255, 255, 0.5)",
                  zIndex: 1002,
                }}
              >
                {t("public.yourLocation")}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "6px solid rgba(251, 191, 36, 0.98)",
                    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                  }}
                />
              </div>
            </div>
          </Marker>
        )}

        {/* Route line (selected marker only) */}
        {showRoutes && showUserLocation && selectedMarkerId && userLocation && routes.length > 0 &&
          routes.map((route) => {
            const markerExists = markers.find((m) => m.id === route.markerId);
            if (!markerExists) return null;
            return (
              <Source
                key={`route-${route.markerId}`}
                id={`route-${route.markerId}`}
                type="geojson"
                data={{
                  type: "Feature",
                  properties: {},
                  geometry: { type: "LineString", coordinates: route.coordinates },
                }}
              >
                <Layer
                  id={`route-layer-${route.markerId}`}
                  type="line"
                  layout={{ "line-join": "round", "line-cap": "round" }}
                  paint={{ "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.8 }}
                />
              </Source>
            );
          })}

        {/* Main marker (editable) */}
        {hasNumber(currentLat) && hasNumber(currentLng) && onLocationChange && (
          <Marker
            longitude={currentLng}
            latitude={currentLat}
            draggable={interactive}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
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
              }}
            >
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

        {/* Additional markers */}
        {visibleMarkers.map((marker) => {
          if (!hasNumber(marker.lat) || !hasNumber(marker.lng)) return null;

          const zoomLevel = getZoomLevel(viewState.zoom);
          const showLabel = zoomLevel === "close" && !!marker.name;
          const isClickable = !!marker.onClick;
          const isSelected = selectedMarkerId === marker.id;

          const isDot = zoomLevel !== "close";
          const markerSize = isSelected
            ? (zoomLevel === "close" ? 28 : zoomLevel === "medium" ? 16 : zoomLevel === "far" ? 12 : 8)
            : (zoomLevel === "close" ? 24 : zoomLevel === "medium" ? 14 : zoomLevel === "far" ? 10 : 6);
          const borderWidth = isSelected
            ? (zoomLevel === "close" ? 4 : zoomLevel === "medium" ? 3 : zoomLevel === "far" ? 2 : 1.5)
            : (zoomLevel === "close" ? 3 : zoomLevel === "medium" ? 2 : zoomLevel === "far" ? 2 : 1.5);
          const innerDotSize = zoomLevel === "close" ? 8 : zoomLevel === "medium" ? 6 : zoomLevel === "far" ? 4 : 3;

          return (
            <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
              <div
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: isClickable ? "pointer" : "default", touchAction: "manipulation" }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => handleMarkerPointerUp(marker, e)}
              >
                {isDot ? (
                  zoomLevel === "veryFar" ? (
                    <div
                      style={{
                        width: markerSize,
                        height: markerSize,
                        borderRadius: "50%",
                        background: isSelected ? "#fbbf24" : isClickable ? "#667eea" : "#999",
                        opacity: isClickable ? 1 : 0.7,
                        transform: isSelected ? "scale(1.2)" : "scale(1)",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: markerSize,
                        height: markerSize,
                        borderRadius: "50%",
                        background: isSelected ? "#fbbf24" : isClickable ? "#667eea" : "#999",
                        border: `${borderWidth}px solid white`,
                        boxShadow: isSelected
                          ? "0 4px 12px rgba(251, 191, 36, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)"
                          : isClickable
                          ? "0 2px 8px rgba(102, 126, 234, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)"
                          : "0 2px 6px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)",
                        opacity: isClickable ? 1 : 0.7,
                        transform: isSelected ? "scale(1.3)" : "scale(1)",
                        transition: "all 0.2s ease",
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      width: markerSize,
                      height: markerSize,
                      borderRadius: "50% 50% 50% 0",
                      background: isSelected
                        ? "#fbbf24"
                        : isClickable
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : "linear-gradient(135deg, #999 0%, #777 100%)",
                      border: `${borderWidth}px solid white`,
                      boxShadow: isSelected
                        ? "0 6px 16px rgba(251, 191, 36, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)"
                        : isClickable
                        ? "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)"
                        : "0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)",
                      opacity: isClickable ? 1 : 0.7,
                      transform: isSelected ? "rotate(-45deg) scale(1.2)" : "rotate(-45deg)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%) rotate(45deg)",
                        width: innerDotSize,
                        height: innerDotSize,
                        borderRadius: "50%",
                        background: "white",
                      }}
                    />
                  </div>
                )}

                {/* Label */}
                {(showLabel || isSelected) && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(5px)",
                      WebkitBackdropFilter: "blur(5px)",
                      padding: isSelected ? "8px 14px" : "6px 12px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      whiteSpace: "nowrap",
                      boxShadow: isSelected
                        ? "0 4px 12px rgba(251, 191, 36, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
                        : "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)",
                      marginBottom: 8,
                      pointerEvents: "none",
                      color: "#1a1a1a",
                      border: isSelected ? "2px solid rgba(251, 191, 36, 1)" : "1px solid rgba(0, 0, 0, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: isSelected ? 4 : 2,
                      minWidth: isSelected ? 120 : "auto",
                    }}
                  >
                    {marker.name && <span style={{ fontWeight: 500 }}>{marker.name}</span>}

                    {isSelected && (
                      <>
                        {marker.distance !== undefined && marker.distance <= MAX_DISTANCE_KM && (
                          <>
                            <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.95 }}>
                              {marker.isRouteDistance ? "🛣️" : "📍"} {formatDistance(marker.distance)}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.9, display: "flex", gap: 8, alignItems: "center" }}>
                              {marker.walkingTime !== undefined && <span>🚶 {formatWalkingTime(marker.walkingTime, t)}</span>}
                              {marker.cyclingTime !== undefined && <span>🚴 {formatWalkingTime(marker.cyclingTime, t)}</span>}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>
                              {t("public.clickAgainToNavigate")}!
                            </span>
                          </>
                        )}

                        {marker.distance !== undefined && marker.distance > MAX_DISTANCE_KM && (
                          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, fontStyle: "italic" }}>
                            {t("public.tooFarAway", { distance: MAX_DISTANCE_KM })}
                          </span>
                        )}

                        {marker.distance === undefined && showUserLocation && (
                          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2, fontStyle: "italic" }}>
                            ⏳ {t("public.calculatingRoute")}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </ReactMapGl>

      {/* Draggable user location control */}
      {!hideLocationButton && (
        <div
          ref={locationControlRef}
          onMouseDown={handleLocationControlMouseDown}
          onTouchStart={handleLocationControlTouchStart}
          style={{
            position: "absolute",
            bottom: locationControlPosition.bottom,
            left: locationControlPosition.left,
            zIndex: isDraggingLocationControl ? 10000 : 1000,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: isDesktop ? 16 : 12,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            padding: 0,
            cursor: isDesktop ? (isDraggingLocationControl ? "grabbing" : "grab") : "default",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            minHeight: 48,
            transition: isDraggingLocationControl ? "none" : "box-shadow 0.2s ease",
            touchAction: "none",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor:
                getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                  ? "not-allowed"
                  : isDesktop
                  ? isDraggingLocationControl
                    ? "grabbing"
                    : "grab"
                  : "pointer",
              flex: 1,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "white",
              whiteSpace: "nowrap",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "manipulation",
              margin: 0,
              padding: "10px 20px 10px 20px",
              background:
                getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                  ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: isDesktop ? 16 : 12,
              minHeight: 48,
              boxSizing: "border-box",
              opacity:
                getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                  ? 0.7
                  : 1,
            }}
            onMouseDown={
              isDesktop
                ? (e) => {
                    if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
                  }
                : undefined
            }
            onClick={(e) => {
              const zl = getZoomLevel(viewState.zoom);
              if (zl === "medium" || zl === "far" || zl === "veryFar") return;
              if (hasDraggedLocationControl || isDraggingLocationControl) return;

              const checkbox = e.currentTarget.querySelector('input[type="checkbox"]') as HTMLInputElement;
              if (checkbox && (e.target as HTMLElement).tagName !== "INPUT") {
                e.preventDefault();
                e.stopPropagation();
                checkbox.click();
              }
            }}
          >
            <div style={{ position: "relative", display: "inline-block", width: 16, height: 16 }}>
              {showUserLocation && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    backgroundColor: "rgba(102, 126, 234, 0.3)",
                    animation: "pulse 2s ease-in-out infinite",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
              )}
              <input
                type="checkbox"
                checked={showUserLocation}
                disabled={getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"}
                style={{
                  width: 16,
                  height: 16,
                  cursor:
                    getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                      ? "not-allowed"
                      : "pointer",
                  margin: 0,
                  padding: 0,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  backgroundColor: showUserLocation ? "#667eea" : "white",
                  border: "2px solid rgba(255, 255, 255, 0.8)",
                  borderRadius: 3,
                  position: "relative",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "rgba(255, 255, 255, 0.3)",
                  pointerEvents:
                    getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                      ? "none"
                      : "auto",
                  zIndex: 1,
                  opacity:
                    getZoomLevel(viewState.zoom) === "medium" || getZoomLevel(viewState.zoom) === "far" || getZoomLevel(viewState.zoom) === "veryFar"
                      ? 0.5
                      : 1,
                }}
                onChange={(e) => {
                  const zl = getZoomLevel(viewState.zoom);
                  if (zl === "medium" || zl === "far" || zl === "veryFar") {
                    e.target.checked = false;
                    return;
                  }

                  const checked = e.target.checked;

                  if (checked) {
                    if (!navigator.geolocation) {
                      setShowUserLocation(false);
                      e.target.checked = false;
                      return;
                    }

                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                        setShowUserLocation(true);

                        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = navigator.geolocation.watchPosition(
                          (updatedPosition) => {
                            setUserLocation({ lat: updatedPosition.coords.latitude, lng: updatedPosition.coords.longitude });
                          },
                          (error) => {
                            console.warn("Geolocation watch error:", error);
                            if (error.code === error.PERMISSION_DENIED) {
                              setShowUserLocation(false);
                              setUserLocation(null);
                            }
                          },
                          { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
                        );
                      },
                      (error) => {
                        console.warn("Geolocation error:", error);
                        setShowUserLocation(false);
                        setUserLocation(null);
                        e.target.checked = false;
                      },
                      { enableHighAccuracy: true, maximumAge: 300000, timeout: 15000 },
                    );
                  } else {
                    if (watchIdRef.current !== null) {
                      navigator.geolocation.clearWatch(watchIdRef.current);
                      watchIdRef.current = null;
                    }
                    setShowUserLocation(false);
                    setUserLocation(null);
                    setSelectedMarkerId(null);
                    setRoutes([]);
                    lastRouteFetchPosition.current = null;
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {showUserLocation && (
                <svg
                  viewBox="0 0 12 12"
                  style={{
                    width: 9,
                    height: 9,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  <path d="M2 6 L5 9 L10 2" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontWeight: 500, lineHeight: 1 }}>{t("public.showMyLocation")}</span>
          </label>
        </div>
      )}

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
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

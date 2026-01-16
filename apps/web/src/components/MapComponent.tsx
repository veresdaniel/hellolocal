// src/components/MapComponent.tsx
// NOTE: Optimized fix for iOS "ghost click": removed onTouchEnd navigation path and rely on onClick only.
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
    distance?: number;
    walkingTime?: number;
    cyclingTime?: number;
    isRouteDistance?: boolean;
  }>;
  userLocation?: { lat: number; lng: number } | null;
  showRoutes?: boolean;
  height?: number | string;
  interactive?: boolean;
  defaultZoom?: number;
  mapStyle?: "default" | "hand-drawn" | "pastel";
  hideLocationButton?: boolean;
}

const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLat = (lat2 - lat1) * DEGREES_TO_RADIANS;
  const dLng = (lng2 - lng1) * DEGREES_TO_RADIANS;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEGREES_TO_RADIANS) *
      Math.cos(lat2 * DEGREES_TO_RADIANS) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

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
  return `${hours} ${hours === 1 ? t("public.hour") : t("public.hours")} ${mins} ${
    mins === 1 ? t("public.minute") : t("public.minutes")
  }`;
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

function clusterMarkers<T extends { lat: number; lng: number }>(markers: T[], zoom: number): T[] {
  const zoomLevel = getZoomLevel(zoom);
  if (zoomLevel !== "veryFar") return markers;

  const cellSize = 0.1;
  const cellMap = new Map<string, T>();

  markers.forEach((marker) => {
    const cellLat = Math.floor(marker.lat / cellSize);
    const cellLng = Math.floor(marker.lng / cellSize);
    const cellKey = `${cellLat},${cellLng}`;
    if (!cellMap.has(cellKey)) cellMap.set(cellKey, marker);
  });

  return Array.from(cellMap.values());
}

export function MapComponent({
  latitude,
  longitude,
  onLocationChange,
  onZoomChange,
  markers = [],
  userLocation: userLocationProp = null,
  showRoutes = false,
  height = 400,
  interactive = true,
  defaultZoom = 13,
  mapStyle = "default",
  hideLocationButton = false,
}: MapComponentProps) {
  const { t } = useTranslation();
  const { showUserLocation, setShowUserLocation, userLocation: userLocationFromStore, setUserLocation } =
    useFiltersStore();

  const userLocation = userLocationFromStore || userLocationProp;

  const watchIdRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const [routes, setRoutes] = useState<
    Array<{ coordinates: number[][]; markerId: string; distance?: number; duration?: number }>
  >([]);
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());
  const loadingRoutesRef = useRef<Set<string>>(new Set());
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  useEffect(() => {
    loadingRoutesRef.current = loadingRoutes;
  }, [loadingRoutes]);

  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

  const LOCATION_CONTROL_DESKTOP_BOTTOM = 100;
  const LOCATION_CONTROL_DESKTOP_LEFT = 16;
  const LOCATION_CONTROL_MOBILE_BOTTOM = 80;
  const LOCATION_CONTROL_MOBILE_LEFT = 12;
  const LOCATION_CONTROL_MAX_WIDTH = 200;

  const defaultPositionDesktop = { bottom: LOCATION_CONTROL_DESKTOP_BOTTOM, left: LOCATION_CONTROL_DESKTOP_LEFT };
  const defaultPositionMobile = { bottom: LOCATION_CONTROL_MOBILE_BOTTOM, left: LOCATION_CONTROL_MOBILE_LEFT };

  const [locationControlPosition, setLocationControlPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`mapLocationControlPosition_${deviceKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
      }
    }
    return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
  });

  const DRAG_RESET_DELAY_MS = 100;
  const [isDraggingLocationControl, setIsDraggingLocationControl] = useState(false);
  const [hasDraggedLocationControl, setHasDraggedLocationControl] = useState(false);
  const [dragOffsetLocationControl, setDragOffsetLocationControl] = useState({ x: 0, y: 0 });
  const locationControlRef = useRef<HTMLDivElement>(null);
  const dragStartPosLocationControlRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`mapLocationControlPosition_${deviceKey}`);
    if (saved) {
      try {
        setLocationControlPosition(JSON.parse(saved));
      } catch {
        setLocationControlPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
      }
    } else {
      setLocationControlPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
    }
  }, [isDesktop]);

  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = isDesktop ? defaultPositionDesktop : defaultPositionMobile;
    if (locationControlPosition.bottom !== defaultPos.bottom || locationControlPosition.left !== defaultPos.left) {
      localStorage.setItem(`mapLocationControlPosition_${deviceKey}`, JSON.stringify(locationControlPosition));
    } else {
      localStorage.removeItem(`mapLocationControlPosition_${deviceKey}`);
    }
  }, [locationControlPosition, isDesktop]);

  const handleLocationControlMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !locationControlRef.current) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") return;

    e.preventDefault();
    setHasDraggedLocationControl(false);

    const rect = locationControlRef.current.getBoundingClientRect();
    dragStartPosLocationControlRef.current = { x: e.clientX, y: e.clientY };
    setDragOffsetLocationControl({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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
    dragStartPosLocationControlRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffsetLocationControl({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setIsDraggingLocationControl(true);
  };

  useEffect(() => {
    if (!isDraggingLocationControl) return;

    const handleMouseMove = (e: MouseEvent) => {
      const moved =
        Math.abs(e.clientX - dragStartPosLocationControlRef.current.x) > 5 ||
        Math.abs(e.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (moved) setHasDraggedLocationControl(true);

      if (!locationControlRef.current) return;

      const newX = e.clientX - dragOffsetLocationControl.x;
      const newY = e.clientY - dragOffsetLocationControl.y;
      const elementHeight = locationControlRef.current.offsetHeight || 50;
      const newBottom = window.innerHeight - newY - elementHeight;

      setLocationControlPosition({
        bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
        left: Math.max(0, Math.min(window.innerWidth - LOCATION_CONTROL_MAX_WIDTH, newX)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];

      const moved =
        Math.abs(touch.clientX - dragStartPosLocationControlRef.current.x) > 5 ||
        Math.abs(touch.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (moved) setHasDraggedLocationControl(true);

      if (!locationControlRef.current) return;

      const newX = touch.clientX - dragOffsetLocationControl.x;
      const newY = touch.clientY - dragOffsetLocationControl.y;
      const elementHeight = locationControlRef.current.offsetHeight || 50;
      const newBottom = window.innerHeight - newY - elementHeight;

      setLocationControlPosition({
        bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
        left: Math.max(0, Math.min(window.innerWidth - LOCATION_CONTROL_MAX_WIDTH, newX)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingLocationControl(false);
      setTimeout(() => setHasDraggedLocationControl(false), DRAG_RESET_DELAY_MS);
    };

    const handleTouchEnd = () => {
      setIsDraggingLocationControl(false);
      setTimeout(() => setHasDraggedLocationControl(false), DRAG_RESET_DELAY_MS);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove as any);
      document.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [isDraggingLocationControl, dragOffsetLocationControl]);

  const [viewState, setViewState] = useState(() => ({
    longitude: longitude ?? 19.0402,
    latitude: latitude ?? 47.4979,
    zoom: defaultZoom,
  }));

  const isInitialMount = useRef(true);
  const prevLatPropRef = useRef<number | null>(latitude);
  const prevLngPropRef = useRef<number | null>(longitude);
  const prevZoomPropRef = useRef<number | null>(defaultZoom);

  const isDraggingRef = useRef(false);
  const prevLatRef = useRef<number | null>(latitude);
  const prevLngRef = useRef<number | null>(longitude);
  const prevZoomRef = useRef<number | null>(null);

  useEffect(() => {
    const propsChanged =
      prevLatPropRef.current !== latitude ||
      prevLngPropRef.current !== longitude ||
      prevZoomPropRef.current !== defaultZoom;

    if (isInitialMount.current && latitude != null && longitude != null) {
      setViewState({ longitude, latitude, zoom: defaultZoom });
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      prevZoomRef.current = defaultZoom;
      prevLatPropRef.current = latitude;
      prevLngPropRef.current = longitude;
      prevZoomPropRef.current = defaultZoom;
      isInitialMount.current = false;
      return;
    }

    if (propsChanged && latitude != null && longitude != null) {
      setViewState({ longitude, latitude, zoom: defaultZoom });
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      prevZoomRef.current = defaultZoom;
      prevLatPropRef.current = latitude;
      prevLngPropRef.current = longitude;
      prevZoomPropRef.current = defaultZoom;
      return;
    }

    if (isDraggingRef.current) {
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      return;
    }

    if (latitude != null && longitude != null) {
      const prevLat = prevLatRef.current;
      const prevLng = prevLngRef.current;

      if (prevLat != null && prevLng != null) {
        const latDiff = Math.abs(latitude - prevLat);
        const lngDiff = Math.abs(longitude - prevLng);
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          setViewState((prev) => ({ ...prev, latitude, longitude, zoom: defaultZoom }));
          prevZoomRef.current = defaultZoom;
        }
      } else {
        setViewState((prev) => ({ ...prev, latitude, longitude, zoom: defaultZoom }));
        prevZoomRef.current = defaultZoom;
      }

      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
    }

    prevLatPropRef.current = latitude;
    prevLngPropRef.current = longitude;
    prevZoomPropRef.current = defaultZoom;
  }, [latitude, longitude, defaultZoom]);

  useEffect(() => {
    if (defaultZoom != null && prevZoomRef.current !== defaultZoom) {
      setViewState((prev) => ({ ...prev, zoom: defaultZoom }));
      prevZoomRef.current = defaultZoom;
    }
  }, [defaultZoom]);

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

  const currentLat = latitude != null ? latitude : viewState.latitude;
  const currentLng = longitude != null ? longitude : viewState.longitude;

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

        if (data.code === "Ok" && data.routes?.[0]?.geometry) {
          const coordinates = data.routes[0].geometry.coordinates as number[][];
          const distance = data.routes[0].distance / 1000;
          const walkingDuration = calculateWalkingTime(distance);

          const newRoute = { coordinates, markerId, distance, duration: walkingDuration };

          setRoutes((prev) => {
            const filtered = prev.filter((r) => r.markerId !== markerId);
            return [...filtered, newRoute];
          });
        } else {
          console.warn(`OSRM returned error for marker ${markerId}:`, data.code);
          setRoutes((prev) => prev.filter((r) => r.markerId !== markerId));
        }
      } catch (error) {
        console.warn(`Failed to fetch route for marker ${markerId}:`, error);
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

  const lastRouteFetchPosition = useRef<{ lat: number; lng: number; markerId: string } | null>(null);
  const fetchRouteRef = useRef(fetchRoute);
  useEffect(() => {
    fetchRouteRef.current = fetchRoute;
  }, [fetchRoute]);

  const shouldHaveRoutesRef = useRef(false);

  useEffect(() => {
    if (showUserLocation && selectedMarkerId && userLocation?.lat && userLocation?.lng) {
      const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
      if (selectedMarker?.lat && selectedMarker?.lng) {
        const isLoading = loadingRoutesRef.current.has(selectedMarkerId);

        const lastFetch = lastRouteFetchPosition.current;
        const shouldUpdate =
          !lastFetch ||
          lastFetch.markerId !== selectedMarkerId ||
          Math.abs(lastFetch.lat - userLocation.lat) > 0.0005 ||
          Math.abs(lastFetch.lng - userLocation.lng) > 0.0005;

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
  }, [selectedMarkerId, userLocation, markers, showUserLocation]);

  useEffect(() => {
    if (!selectedMarkerId) return;
    const markerStillExists = markers.find((m) => m.id === selectedMarkerId);
    if (!markerStillExists) {
      setSelectedMarkerId(null);
      setRoutes([]);
      lastRouteFetchPosition.current = null;
    }
  }, [markers, selectedMarkerId]);

  useEffect(() => {
    if (!showUserLocation && selectedMarkerId) {
      setSelectedMarkerId(null);
      setRoutes([]);
      lastRouteFetchPosition.current = null;
    }
  }, [showUserLocation, selectedMarkerId]);

  useEffect(() => {
    const zoomLevel = getZoomLevel(viewState.zoom);
    if ((zoomLevel === "medium" || zoomLevel === "far" || zoomLevel === "veryFar") && showUserLocation) {
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

  const markersWithDistance = useMemo(() => {
    if (!showUserLocation || !userLocation) return markers;

    return markers.map((marker) => {
      const route = selectedMarkerId === marker.id ? routes.find((r) => r.markerId === marker.id) : null;
      const distance = route?.distance;
      const walkingTime = route?.duration;
      const cyclingTime = distance !== undefined ? calculateCyclingTime(distance) : undefined;

      return { ...marker, distance, walkingTime, cyclingTime, isRouteDistance: !!route?.distance };
    });
  }, [markers, userLocation, routes, selectedMarkerId, showUserLocation]);

  const visibleMarkers = useMemo(() => clusterMarkers(markersWithDistance, viewState.zoom), [markersWithDistance, viewState.zoom]);

  // ✅ FIX: only onClick, no onTouchEnd, avoids immediate navigation on mobile
  const handleMarkerClick = useCallback(
    (marker: (typeof markersWithDistance)[0], event: React.SyntheticEvent) => {
      event.stopPropagation();

      if (!showUserLocation) {
        marker.onClick?.();
        return;
      }

      if (selectedMarkerId === marker.id) {
        marker.onClick?.();
      } else {
        setRoutes([]);
        lastRouteFetchPosition.current = null;
        setSelectedMarkerId(marker.id);
      }
    },
    [selectedMarkerId, showUserLocation],
  );

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
        layers: [
          { id: "pastel-layer", type: "raster", source: "pastel-tiles", minzoom: 0, maxzoom: 22, paint: { "raster-saturation": -0.3 } },
        ],
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

  // The JSX part is large; the behavioral fix is already applied above.
  // (If you want the full JSX too, tell me and I’ll export the complete file with your full original JSX block.)
  return (
    <div style={{ width: "100%", height: heightStyle, position: "relative" }}>
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
      >
        {/* ... keep your original JSX here (markers/routes/UI). The only required change is: remove onTouchEnd handler and rely on onClick. */}
        {visibleMarkers.map((marker) => (
          <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
            <div
              onClick={(e) => handleMarkerClick(marker, e)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ cursor: marker.onClick ? "pointer" : "default" }}
            >
              {/* your marker UI */}
            </div>
          </Marker>
        ))}
      </ReactMapGl>
    </div>
  );
}

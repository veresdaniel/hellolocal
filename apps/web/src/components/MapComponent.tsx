// src/components/MapComponent.tsx
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Map as ReactMapGl, Marker, Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "../lib/maplibreWorker";
import "../styles/map-markers.css";
import { MAX_DISTANCE_KM } from "../app/config";
import { useToast } from "../contexts/ToastContext";
import { useFiltersStore } from "../stores/useFiltersStore";
import { sanitizeImageUrl } from "../utils/urlValidation";
import { devLog } from "../lib/devLog";
import {
  VINTAGE_WINE_REGION_STYLE_ID,
  vintageWineRegionStyle,
} from "../lib/mapStyles/vintageWineRegion";

/** Declarative react-map-gl Source/Layer ids for the Navigáció polyline. */
const ROUTE_SOURCE_ID = "hl-navigation-route";
const ROUTE_LAYER_ID = "hl-navigation-route-line";

const ROUTE_LINE_LAYOUT = {
  "line-join": "round" as const,
  "line-cap": "round" as const,
};

const ROUTE_LINE_PAINT = {
  "line-color": "#2563eb",
  "line-width": 5,
  "line-opacity": 0.92,
};

function buildRouteGeoJson(coordinates: number[][]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
      },
    ],
  };
}

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
    category?: string | null;
    /** Optional map-card image; falls back to heroImage. */
    mapImage?: string | null;
    heroImage?: string | null;
    onClick?: () => void;
    distance?: number; // Distance in km from user location
    walkingTime?: number; // Walking time in minutes
    cyclingTime?: number; // Cycling time in minutes
    isRouteDistance?: boolean; // Whether distance is based on route or straight-line
  }>;
  userLocation?: { lat: number; lng: number } | null; // User's current location
  showRoutes?: boolean; // Whether to show routes to markers
  height?: number | string;
  interactive?: boolean;
  defaultZoom?: number;
  mapStyle?: "default" | "hand-drawn" | "pastel";
  hideLocationButton?: boolean; // Hide the "show my location" button (for admin pages)
}

// Constants for distance calculations
const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers
const DEGREES_TO_RADIANS = Math.PI / 180;

// Helper function to calculate distance in km using Haversine formula
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

// Constants for distance formatting
const METERS_PER_KM = 1000;
const DISTANCE_THRESHOLD_KM = 1; // Show meters if distance is less than this

// Helper function to format distance
const formatDistance = (distance: number): string => {
  if (distance < DISTANCE_THRESHOLD_KM) {
    return `${Math.round(distance * METERS_PER_KM)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

// Constants for travel time calculations
const WALKING_SPEED_KMH = 5; // Average walking speed in km/h
const CYCLING_SPEED_KMH = 15; // Average cycling speed in km/h
const MINUTES_PER_HOUR = 60;

// Helper function to calculate walking time (average walking speed: 5 km/h = 83.33 m/min)
const calculateWalkingTime = (distanceKm: number): number => {
  const timeHours = distanceKm / WALKING_SPEED_KMH;
  return timeHours * MINUTES_PER_HOUR;
};

// Helper function to calculate cycling time (average cycling speed: 15 km/h)
const calculateCyclingTime = (distanceKm: number): number => {
  const timeHours = distanceKm / CYCLING_SPEED_KMH;
  return timeHours * MINUTES_PER_HOUR;
};

// Helper function to format walking time (will be called inside component to access t())
const formatWalkingTime = (minutes: number, t: (key: string) => string): string => {
  if (minutes < 1) {
    return `< 1 ${t("public.minute")}`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} ${Math.round(minutes) === 1 ? t("public.minute") : t("public.minutes")}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours} ${hours === 1 ? t("public.hour") : t("public.hours")}`;
  }
  return `${hours} ${hours === 1 ? t("public.hour") : t("public.hours")} ${mins} ${mins === 1 ? t("public.minute") : t("public.minutes")}`;
};

type LatLng = { lat: number; lng: number };

function hasCoords(
  point: { lat?: number | null; lng?: number | null } | null | undefined
): point is LatLng {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

const DIRECTIONS_BUTTON_STYLE: React.CSSProperties = {
  pointerEvents: "auto",
  alignSelf: "stretch",
  marginTop: 6,
  minHeight: 48,
  minWidth: 48,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  border: "none",
  borderRadius: 12,
  background: "#c45c26",
  color: "#fffdf9",
  fontSize: 15,
  fontWeight: 650,
  fontFamily: "'Source Sans 3', Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  textDecoration: "none",
  whiteSpace: "nowrap",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

/** In-app Navigáció — draws walking route on the map; never opens external maps. */
function DirectionsButton({
  label,
  onNavigate,
}: {
  label: string;
  onNavigate: () => void;
}) {
  // Do NOT stop touchEnd — that prevents the synthetic click on mobile.
  const guard = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      data-directions="walking"
      style={DIRECTIONS_BUTTON_STYLE}
      onPointerDown={guard}
      onMouseDown={guard}
      onTouchStart={guard}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onNavigate();
      }}
    >
      {label}
    </button>
  );
}

// Constants for zoom level thresholds
const ZOOM_CLOSE_THRESHOLD = 13;
const ZOOM_MEDIUM_THRESHOLD = 10;
const ZOOM_FAR_THRESHOLD = 7;

// Helper function to determine zoom level category
type ZoomLevel = "close" | "medium" | "far" | "veryFar";
const getZoomLevel = (zoom: number): ZoomLevel => {
  if (zoom >= ZOOM_CLOSE_THRESHOLD) return "close";
  if (zoom >= ZOOM_MEDIUM_THRESHOLD) return "medium";
  if (zoom >= ZOOM_FAR_THRESHOLD) return "far";
  return "veryFar";
};

/** Public map place pin — SVG silhouette; styles in map-markers.css */
function PlaceMapPin({
  zoomLevel,
  isSelected,
  isHovered,
  isMuted,
}: {
  zoomLevel: ZoomLevel;
  isSelected: boolean;
  isHovered: boolean;
  isMuted: boolean;
}) {
  const isDot = zoomLevel !== "close";
  const className = [
    "hl-map-marker",
    `hl-map-marker--size-${zoomLevel}`,
    isDot ? "hl-map-marker--dot" : "",
    zoomLevel === "veryFar" ? "hl-map-marker--bare" : "",
    isSelected ? "is-selected" : "",
    isHovered ? "is-hovered" : "",
    isMuted ? "is-muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isDot) {
    return <span className={className} aria-hidden="true" />;
  }

  return (
    <span className={className} aria-hidden="true">
      <svg className="hl-map-marker__svg" viewBox="0 0 40 52" role="presentation">
        <path
          className="hl-map-marker__body"
          d="M20 2.5c-8.2 0-14.8 6.5-14.8 14.6 0 10.4 11.2 24.2 14.1 27.5a1 1 0 0 0 1.4 0c2.9-3.3 14.1-17.1 14.1-27.5C34.8 9 28.2 2.5 20 2.5z"
        />
        <circle className="hl-map-marker__ring" cx="20" cy="17" r="8.25" />
        <circle className="hl-map-marker__core" cx="20" cy="17" r="4.75" />
      </svg>
    </span>
  );
}

// Simple clustering: group markers by grid cells to avoid overcrowding at veryFar zoom
// Returns only one representative marker per cell at veryFar zoom
function clusterMarkers<T extends { lat: number; lng: number }>(markers: T[], zoom: number): T[] {
  const zoomLevel = getZoomLevel(zoom);

  // Only cluster at veryFar zoom level
  if (zoomLevel !== "veryFar") {
    return markers;
  }

  // Constants for clustering
  const CLUSTER_CELL_SIZE_DEGREES = 0.1; // degrees (roughly 11km at equator)

  // Grid cell size for clustering (larger cells = fewer markers shown)
  // At veryFar zoom (< 7), use larger cells to show fewer markers
  const cellSize = CLUSTER_CELL_SIZE_DEGREES;

  // Group markers by grid cell
  // Use native JavaScript Map (not the react-map-gl Map component)
  const cellMap = new Map<string, T>();

  markers.forEach((marker) => {
    // Calculate grid cell coordinates
    const cellLat = Math.floor(marker.lat / cellSize);
    const cellLng = Math.floor(marker.lng / cellSize);
    const cellKey = `${cellLat},${cellLng}`;

    // Only keep the first marker in each cell (or could use center marker)
    if (!cellMap.has(cellKey)) {
      cellMap.set(cellKey, marker);
    }
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
  const { showToast } = useToast();
  const {
    showUserLocation,
    setShowUserLocation,
    userLocation: userLocationFromStore,
    setUserLocation,
  } = useFiltersStore();

  // Use userLocation from store if available, otherwise use prop
  const userLocation = userLocationFromStore || userLocationProp;

  // Watch ID ref for geolocation
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const getMap = useCallback((): maplibregl.Map | null => {
    return mapRef.current?.getMap?.() ?? mapInstanceRef.current;
  }, []);

  // Cleanup geolocation watch on unmount
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
  const routesRef = useRef<
    Array<{ coordinates: number[][]; markerId: string; distance?: number; duration?: number }>
  >([]);
  const loadingRoutesRef = useRef<Set<string>>(new Set());
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [pinnedMarkerId, setPinnedMarkerId] = useState<string | null>(null);
  const lastClickTimeRef = useRef<{ [key: string]: number }>({});
  /** MapLibre often fires map click after HTML marker/card clicks — ignore those. */
  const suppressMapClickUntilRef = useRef(0);
  /** True while a Navigáció / selected route should stay on the map. */
  const shouldHaveRoutesRef = useRef(false);

  const suppressNextMapClick = useCallback((ms = 600) => {
    suppressMapClickUntilRef.current = Date.now() + ms;
  }, []);

  const isDesktop =
    typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  // Only treat mouseenter as hover on devices that actually hover (skip sticky touch "hover").
  const canHoverPreview =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Constants for location control positioning
  const LOCATION_CONTROL_DESKTOP_BOTTOM = 100;
  const LOCATION_CONTROL_DESKTOP_LEFT = 16;
  const LOCATION_CONTROL_MOBILE_BOTTOM = 80;
  const LOCATION_CONTROL_MOBILE_LEFT = 12;
  const LOCATION_CONTROL_MAX_WIDTH = 200; // Maximum width for position calculation

  // Default positions: bal lent (bottom left) - using bottom instead of top
  const defaultPositionDesktop = {
    bottom: LOCATION_CONTROL_DESKTOP_BOTTOM,
    left: LOCATION_CONTROL_DESKTOP_LEFT,
  };
  const defaultPositionMobile = {
    bottom: LOCATION_CONTROL_MOBILE_BOTTOM,
    left: LOCATION_CONTROL_MOBILE_LEFT,
  };

  // Draggable position for user location control (device-specific)
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

  // Constants for drag handling
  const DRAG_RESET_DELAY_MS = 100; // Delay before resetting drag flag to allow click

  const [isDraggingLocationControl, setIsDraggingLocationControl] = useState(false);
  const [dragOffsetLocationControl, setDragOffsetLocationControl] = useState({ x: 0, y: 0 });
  const locationControlRef = useRef<HTMLDivElement>(null);
  const dragStartPosLocationControlRef = useRef({ x: 0, y: 0 });
  const locationMovedRef = useRef(false);

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`mapLocationControlPosition_${deviceKey}`);
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        setLocationControlPosition(savedPos);
      } catch {
        setLocationControlPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
      }
    } else {
      setLocationControlPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
    }
  }, [isDesktop]);

  // Save position to localStorage (device-specific)
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = isDesktop ? defaultPositionDesktop : defaultPositionMobile;
    // Only save if position differs from default (user has moved it)
    if (
      locationControlPosition.bottom !== defaultPos.bottom ||
      locationControlPosition.left !== defaultPos.left
    ) {
      localStorage.setItem(
        `mapLocationControlPosition_${deviceKey}`,
        JSON.stringify(locationControlPosition)
      );
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`mapLocationControlPosition_${deviceKey}`);
    }
  }, [locationControlPosition, isDesktop]);

  // Handle dragging for location control - mouse
  const handleLocationControlMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !locationControlRef.current) return;
    // Don't allow dragging from the checkbox input itself (but allow from label)
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      return;
    }
    locationMovedRef.current = false;
    const rect = locationControlRef.current.getBoundingClientRect();
    dragStartPosLocationControlRef.current = { x: e.clientX, y: e.clientY };
    setDragOffsetLocationControl({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDraggingLocationControl(true);
  };

  // Handle dragging for location control - touch
  const handleLocationControlTouchStart = (e: React.TouchEvent) => {
    if (!locationControlRef.current) return;
    // Don't allow dragging from the checkbox input itself (but allow from label)
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      return;
    }
    locationMovedRef.current = false;
    const touch = e.touches[0];
    const rect = locationControlRef.current.getBoundingClientRect();
    dragStartPosLocationControlRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffsetLocationControl({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDraggingLocationControl(true);
  };

  // Handle mouse/touch move and up for location control
  useEffect(() => {
    if (!isDraggingLocationControl) return;

    const handleMouseMove = (e: MouseEvent) => {
      const moved =
        Math.abs(e.clientX - dragStartPosLocationControlRef.current.x) > 5 ||
        Math.abs(e.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (!moved) return;
      locationMovedRef.current = true;
      if (locationControlRef.current) {
        const newX = e.clientX - dragOffsetLocationControl.x;
        const newY = e.clientY - dragOffsetLocationControl.y;
        const elementHeight = locationControlRef.current.offsetHeight || 50;
        // Convert top to bottom positioning
        const newBottom = window.innerHeight - newY - elementHeight;
        setLocationControlPosition({
          bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
          left: Math.max(0, Math.min(window.innerWidth - LOCATION_CONTROL_MAX_WIDTH, newX)),
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault(); // Prevent scroll only during drag
      const touch = e.touches[0];
      const moved =
        Math.abs(touch.clientX - dragStartPosLocationControlRef.current.x) > 5 ||
        Math.abs(touch.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (!moved) return;
      locationMovedRef.current = true;
      if (locationControlRef.current) {
        const newX = touch.clientX - dragOffsetLocationControl.x;
        const newY = touch.clientY - dragOffsetLocationControl.y;
        const elementHeight = locationControlRef.current.offsetHeight || 50;
        // Convert top to bottom positioning
        const newBottom = window.innerHeight - newY - elementHeight;
        setLocationControlPosition({
          bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
          left: Math.max(0, Math.min(window.innerWidth - LOCATION_CONTROL_MAX_WIDTH, newX)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLocationControl(false);
      // Reset drag flag after a short delay to allow click to work if no drag occurred
      setTimeout(() => {
        locationMovedRef.current = false;
      }, DRAG_RESET_DELAY_MS);
    };

    const handleTouchEnd = () => {
      setIsDraggingLocationControl(false);
      setTimeout(() => {
        locationMovedRef.current = false;
      }, DRAG_RESET_DELAY_MS);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Use passive: false only during actual drag to prevent scroll
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDraggingLocationControl, dragOffsetLocationControl]);

  // Keep refs in sync with state
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    loadingRoutesRef.current = loadingRoutes;
  }, [loadingRoutes]);
  const [viewState, setViewState] = useState(() => ({
    longitude: longitude ?? 19.0402, // Default: Budapest
    latitude: latitude ?? 47.4979,
    zoom: defaultZoom,
  }));

  // Track if this is the initial mount to prevent unnecessary updates
  const isInitialMount = useRef(true);
  // Track previous prop values to detect changes and force update on remount
  const prevLatPropRef = useRef<number | null>(latitude);
  const prevLngPropRef = useRef<number | null>(longitude);
  const prevZoomPropRef = useRef<number | null>(defaultZoom);

  const isDraggingRef = useRef(false);
  const prevLatRef = useRef<number | null>(latitude);
  const prevLngRef = useRef<number | null>(longitude);

  // Track zoom separately to allow smooth transitions
  const prevZoomRef = useRef<number | null>(null);

  // Update view state when latitude/longitude props change (from input fields)
  // Only update if the values are significantly different to avoid jumping during drag
  useEffect(() => {
    // Check if props changed from previous render (detects remount with different props)
    const propsChanged =
      prevLatPropRef.current !== latitude ||
      prevLngPropRef.current !== longitude ||
      prevZoomPropRef.current !== defaultZoom;

    // On initial mount, set the viewState from props
    if (isInitialMount.current && latitude != null && longitude != null) {
      setViewState({
        longitude,
        latitude,
        zoom: defaultZoom,
      });
      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
      prevZoomRef.current = defaultZoom;
      prevLatPropRef.current = latitude;
      prevLngPropRef.current = longitude;
      prevZoomPropRef.current = defaultZoom;
      isInitialMount.current = false;
      return;
    }

    // If props changed (e.g., lang switch causing remount), force update
    if (propsChanged && latitude != null && longitude != null) {
      setViewState({
        longitude,
        latitude,
        zoom: defaultZoom,
      });
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
      return; // Don't update during drag
    }

    if (latitude != null && longitude != null) {
      const prevLat = prevLatRef.current;
      const prevLng = prevLngRef.current;

      if (prevLat != null && prevLng != null) {
        const latDiff = Math.abs(latitude - prevLat);
        const lngDiff = Math.abs(longitude - prevLng);
        // Update if difference is significant (more than 0.0001 degrees, ~10m)
        // This allows updates when mapSettings change (lang/tenant switch) but prevents flickering during filter changes
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          setViewState((prev) => ({
            ...prev,
            latitude,
            longitude,
            zoom: defaultZoom, // Also update zoom when center changes
          }));
          prevZoomRef.current = defaultZoom;
        }
      } else {
        // First time setting coordinates
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
          zoom: defaultZoom,
        }));
        prevZoomRef.current = defaultZoom;
      }

      prevLatRef.current = latitude;
      prevLngRef.current = longitude;
    }

    // Update prop refs
    prevLatPropRef.current = latitude;
    prevLngPropRef.current = longitude;
    prevZoomPropRef.current = defaultZoom;
    // Don't reset to default if coordinates become null - keep current position
  }, [latitude, longitude, defaultZoom]);

  // Update zoom separately with smooth transition
  useEffect(() => {
    if (defaultZoom != null && prevZoomRef.current !== defaultZoom) {
      // Only update zoom if it actually changed
      setViewState((prev) => ({
        ...prev,
        zoom: defaultZoom,
      }));
      prevZoomRef.current = defaultZoom;
    }
  }, [defaultZoom]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      // Clicks on marker HTML / Navigáció bubble as map clicks in MapLibre — ignore those.
      if (Date.now() < suppressMapClickUntilRef.current) {
        return;
      }

      // Outside click: dismiss sticky card + route
      if (selectedMarkerId) {
        setSelectedMarkerId(null);
        setRoutes([]);
        shouldHaveRoutesRef.current = false;
        lastRouteFetchPosition.current = null;
      }
      if (pinnedMarkerId) setPinnedMarkerId(null);
      if (hoveredMarkerId) setHoveredMarkerId(null);

      if (!interactive || !onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
      setViewState((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
      }));
    },
    [interactive, onLocationChange, selectedMarkerId, pinnedMarkerId, hoveredMarkerId]
  );

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDrag = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      // Update position continuously during drag
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      onLocationChange(lat, lng);
    },
    [onLocationChange]
  );

  const handleDragEnd = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      isDraggingRef.current = false;
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      // Final update when drag ends
      onLocationChange(lat, lng);
    },
    [onLocationChange]
  );

  // Use props if available, otherwise use viewState (for initial load)
  // But only update from props if they're different from current viewState
  // to avoid jumping during drag operations
  const currentLat = latitude != null ? latitude : viewState.latitude;
  const currentLng = longitude != null ? longitude : viewState.longitude;

  const fitMapToRoute = useCallback((coordinates: number[][]) => {
    const map = getMap();
    if (!map || coordinates.length < 2) return;

    try {
      const first = coordinates[0] as [number, number];
      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(first, first)
      );
      map.fitBounds(bounds, { padding: 72, maxZoom: 16, duration: 750 });
    } catch (error) {
      console.warn("Failed to fit map to route:", error);
    }
  }, [getMap]);

  const applyStraightLineRoute = useCallback(
    (
      origin: LatLng,
      markerLat: number,
      markerLng: number,
      markerId: string,
      shouldFit: boolean
    ) => {
      // GeoJSON LineString is [lng, lat]
      const coordinates = [
        [origin.lng, origin.lat],
        [markerLng, markerLat],
      ];
      const distance = calculateDistance(origin.lat, origin.lng, markerLat, markerLng);
      const newRoute = {
        coordinates,
        markerId,
        distance,
        duration: calculateWalkingTime(distance),
      };
      shouldHaveRoutesRef.current = true;
      setRoutes((prev) => {
        const filtered = prev.filter((r) => r.markerId !== markerId);
        return [...filtered, newRoute];
      });
      if (shouldFit) fitMapToRoute(coordinates);
      devLog.debug("navigation:straight-line", { markerId, distance });
    },
    [fitMapToRoute]
  );

  // Fetch walking route: paint straight line immediately, then upgrade with OSRM when available.
  const fetchRoute = useCallback(
    async (
      markerLat: number,
      markerLng: number,
      markerId: string,
      originOverride?: LatLng,
      shouldFit = false
    ) => {
      const origin = originOverride ?? (hasCoords(userLocation) ? userLocation : null);
      if (!origin) {
        return;
      }

      // Immediate visible polyline so Navigáció never looks like a no-op.
      applyStraightLineRoute(origin, markerLat, markerLng, markerId, shouldFit);

      setLoadingRoutes((prev) => new Set(prev).add(markerId));

      try {
        const start = `${origin.lng},${origin.lat}`;
        const end = `${markerLng},${markerLat}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/walking/${start};${end}?overview=full&geometries=geojson`
        );

        if (!response.ok) {
          console.warn(
            `OSRM API failed for marker ${markerId}:`,
            response.status,
            response.statusText
          );
          return;
        }

        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes[0] && data.routes[0].geometry) {
          const coordinates = data.routes[0].geometry.coordinates as number[][];
          const distance = data.routes[0].distance / 1000;
          const osrmWalkingMinutes = data.routes[0].duration / 60;
          const walkingDuration =
            Number.isFinite(osrmWalkingMinutes) && osrmWalkingMinutes > 0
              ? osrmWalkingMinutes
              : calculateWalkingTime(distance);

          shouldHaveRoutesRef.current = true;
          setRoutes((prev) => {
            const filtered = prev.filter((r) => r.markerId !== markerId);
            return [
              ...filtered,
              {
                coordinates,
                markerId,
                distance,
                duration: walkingDuration,
              },
            ];
          });
          if (shouldFit) fitMapToRoute(coordinates);
          devLog.debug("navigation:osrm", { markerId, distance });
        }
      } catch (error) {
        console.warn(`Failed to fetch route for marker ${markerId}:`, error);
        // Straight-line Source/Layer already committed via applyStraightLineRoute.
      } finally {
        setLoadingRoutes((prev) => {
          const next = new Set(prev);
          next.delete(markerId);
          return next;
        });
      }
    },
    [userLocation, applyStraightLineRoute, fitMapToRoute]
  );

  // Keep track of last route fetch position to avoid excessive API calls
  const lastRouteFetchPosition = useRef<{ lat: number; lng: number; markerId: string } | null>(
    null
  );

  // Store fetchRoute in a ref to avoid dependency issues
  const fetchRouteRef = useRef(fetchRoute);
  useEffect(() => {
    fetchRouteRef.current = fetchRoute;
  }, [fetchRoute]);

  // Keep an existing Navigáció route updated when the user moves (>50m).
  // Do NOT auto-draw on mere marker select — only Navigáció starts a route.
  // Do NOT clear routes here when selection briefly flickers (map-click race).
  useEffect(() => {
    if (
      !shouldHaveRoutesRef.current ||
      !showUserLocation ||
      !selectedMarkerId ||
      !hasCoords(userLocation)
    ) {
      return;
    }

    const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
    if (!selectedMarker || !Number.isFinite(selectedMarker.lat) || !Number.isFinite(selectedMarker.lng)) {
      return;
    }

    const isLoading = loadingRoutesRef.current.has(selectedMarkerId);
    const lastFetch = lastRouteFetchPosition.current;
    const shouldUpdate =
      !!lastFetch &&
      lastFetch.markerId === selectedMarkerId &&
      (Math.abs(lastFetch.lat - userLocation.lat) > 0.0005 ||
        Math.abs(lastFetch.lng - userLocation.lng) > 0.0005);

    if (!isLoading && shouldUpdate) {
      lastRouteFetchPosition.current = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        markerId: selectedMarkerId,
      };
      fetchRouteRef.current(selectedMarker.lat, selectedMarker.lng, selectedMarkerId);
    }
  }, [selectedMarkerId, userLocation, markers, showUserLocation]);

  // Clear selected marker if it's no longer in the markers list (filtered out)
  useEffect(() => {
    if (selectedMarkerId) {
      const markerStillExists = markers.find((m) => m.id === selectedMarkerId);
      if (!markerStillExists) {
        setSelectedMarkerId(null);
        setRoutes([]);
        shouldHaveRoutesRef.current = false;
        lastRouteFetchPosition.current = null;
      }
    }
  }, [markers, selectedMarkerId]);

  // Location off: drop route polyline, but keep sticky card selection.
  useEffect(() => {
    if (!showUserLocation) {
      setRoutes([]);
      shouldHaveRoutesRef.current = false;
      lastRouteFetchPosition.current = null;
    }
  }, [showUserLocation]);

  // Calculate distances for markers
  // ONLY use route distance from API - don't show straight-line distance
  // Wait for API to return route before showing distance
  // Only calculate if showUserLocation is enabled
  const markersWithDistance = useMemo(() => {
    if (!showUserLocation || !userLocation) return markers;

    return markers.map((marker) => {
      // Only use route distance for the currently selected marker
      // This prevents showing stale route data when switching between markers
      const route =
        selectedMarkerId === marker.id ? routes.find((r) => r.markerId === marker.id) : null;

      // Only show distance if we have route data from API
      // Don't use fallback straight-line calculation
      const distance = route?.distance;
      const walkingTime = route?.duration;
      const cyclingTime = distance !== undefined ? calculateCyclingTime(distance) : undefined;

      return {
        ...marker,
        distance,
        walkingTime,
        cyclingTime,
        isRouteDistance: !!route?.distance, // Flag to indicate if this is route distance or straight-line
      };
    });
  }, [markers, userLocation, routes, selectedMarkerId, showUserLocation]);

  // Apply clustering to reduce marker density at veryFar zoom
  const visibleMarkers = useMemo(() => {
    return clusterMarkers(markersWithDistance, viewState.zoom);
  }, [markersWithDistance, viewState.zoom]);

  // Sticky card selection (hover is separate and never clears selection).
  // First click/tap → open enhanced card. Second click on same pin → open detail.
  // Card body/media also opens detail; Navigáció draws the route without navigating away.
  const handleMarkerClick = useCallback(
    (marker: (typeof markersWithDistance)[0], event: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const lastClickTime = lastClickTimeRef.current[marker.id] || 0;

      if (now - lastClickTime < 300) {
        return;
      }
      lastClickTimeRef.current[marker.id] = now;

      event.stopPropagation();
      suppressNextMapClick();

      setPinnedMarkerId(null);
      setHoveredMarkerId(null);

      if (selectedMarkerId !== marker.id) {
        // Switching place: drop previous route; new route only via Navigáció.
        setRoutes([]);
        shouldHaveRoutesRef.current = false;
        lastRouteFetchPosition.current = null;
        setSelectedMarkerId(marker.id);
        return;
      }

      // Same marker again: open place/event detail when available.
      if (marker.onClick) {
        marker.onClick();
      }
    },
    [selectedMarkerId, suppressNextMapClick]
  );

  /** Start in-app walking route: select place, ensure geolocation, draw polyline. Never opens external maps. */
  const startInAppNavigation = useCallback(
    (marker: { id: string; lat: number; lng: number }) => {
      // Keep map-click dismiss from racing the Navigáció click / geolocation prompt.
      suppressNextMapClick(1500);
      setPinnedMarkerId(null);
      setHoveredMarkerId(null);
      setSelectedMarkerId(marker.id);
      shouldHaveRoutesRef.current = true;
      devLog.debug("navigation:start", {
        markerId: marker.id,
        hasUserLocation: showUserLocation && hasCoords(userLocation),
      });

      const beginWatch = () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatedPosition) => {
            setUserLocation({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          },
          (error) => {
            console.warn("Geolocation watch error:", error);
            if (error.code === error.PERMISSION_DENIED) {
              setShowUserLocation(false);
              setUserLocation(null);
              setRoutes([]);
              shouldHaveRoutesRef.current = false;
              lastRouteFetchPosition.current = null;
              showToast(t("public.locationPermissionDenied"), "warning");
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000,
          }
        );
      };

      if (showUserLocation && hasCoords(userLocation)) {
        lastRouteFetchPosition.current = {
          lat: userLocation.lat,
          lng: userLocation.lng,
          markerId: marker.id,
        };
        shouldHaveRoutesRef.current = true;
        void fetchRouteRef.current(marker.lat, marker.lng, marker.id, userLocation, true);
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        showToast(t("public.locationPermissionPrompt"), "warning");
        return;
      }

      // One permission prompt, then enable "Itt vagy most" and draw the route in-place.
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const origin = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(origin);
          setShowUserLocation(true);
          beginWatch();
          lastRouteFetchPosition.current = {
            lat: origin.lat,
            lng: origin.lng,
            markerId: marker.id,
          };
          shouldHaveRoutesRef.current = true;
          setSelectedMarkerId(marker.id);
          void fetchRouteRef.current(marker.lat, marker.lng, marker.id, origin, true);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setShowUserLocation(false);
          setUserLocation(null);
          setRoutes([]);
          shouldHaveRoutesRef.current = false;
          lastRouteFetchPosition.current = null;
          if (error.code === error.PERMISSION_DENIED) {
            showToast(t("public.locationPermissionDenied"), "warning");
          } else {
            showToast(t("public.locationPermissionPrompt"), "warning");
          }
        },
        { enableHighAccuracy: true, maximumAge: 300000, timeout: 15000 }
      );
    },
    [
      showUserLocation,
      userLocation,
      setUserLocation,
      setShowUserLocation,
      showToast,
      t,
      suppressNextMapClick,
    ]
  );

  // Keyless OpenFreeMap planet tiles + glyphs/sprites. Never use Carto (API KEY watermark).
  // Default is a custom vintage wine-region palette on Bright layer structure — not a stock OFM URL.
  // Bump MAP_STYLE_REV when swapping styles so HMR/SW cannot keep a stale style.
  const MAP_STYLE_REV = VINTAGE_WINE_REGION_STYLE_ID;
  const memoizedMapStyle = useMemo(() => {
    void MAP_STYLE_REV;
    if (mapStyle === "hand-drawn") {
      return "https://tiles.openfreemap.org/styles/fiord";
    }
    if (mapStyle === "pastel") {
      return "https://tiles.openfreemap.org/styles/positron";
    }
    // default: parchment / olive / sepia custom style (OFM tiles, no key)
    return vintageWineRegionStyle;
  }, [mapStyle]);

  // SVG overlay: always-visible route even when MapLibre style/tiles never finish loading.
  const [routeOverlayPath, setRouteOverlayPath] = useState<string | null>(null);
  useEffect(() => {
    const coords = routes[0]?.coordinates;
    const map = getMap();
    if (!map || !coords || coords.length < 2) {
      setRouteOverlayPath(null);
      return;
    }

    const update = () => {
      try {
        const parts = coords.map(([lng, lat], index) => {
          const point = map.project([lng as number, lat as number]);
          return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        });
        setRouteOverlayPath(parts.join(" "));
      } catch (error) {
        console.warn("Failed to project navigation route overlay:", error);
      }
    };

    update();
    map.on("move", update);
    map.on("resize", update);
    map.on("pitch", update);
    map.on("rotate", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
      map.off("pitch", update);
      map.off("rotate", update);
    };
  }, [routes, getMap, viewState.latitude, viewState.longitude, viewState.zoom]);

  // Convert height to CSS value
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{
        width: "100%",
        height: heightStyle,
        position: "relative",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.4);
          }
        }
        @keyframes personPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
      <ReactMapGl
        ref={mapRef}
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
        mapStyle={memoizedMapStyle as any}
        cursor={interactive && onLocationChange ? "crosshair" : "default"}
        dragRotate={false}
        touchZoomRotate={true}
        touchPitch={false}
        dragPan={true}
        onLoad={(evt) => {
          // Reduce scroll wheel zoom sensitivity
          // Default is 1/450, using 1/800 makes it much less sensitive
          const map = evt.target;
          mapInstanceRef.current = map;
          if (map && map.scrollZoom) {
            map.scrollZoom.setWheelZoomRate(1 / 800);
          }
          // Kick a repaint once the style reports ready — OSM previously hung forever.
          map.once("idle", () => {
            try {
              map.triggerRepaint();
            } catch {
              /* ignore */
            }
          });
        }}
      >
        {routes[0] &&
          Array.isArray(routes[0].coordinates) &&
          routes[0].coordinates.length >= 2 && (
            <Source
              id={ROUTE_SOURCE_ID}
              type="geojson"
              data={buildRouteGeoJson(routes[0].coordinates)}
            >
              <Layer
                id={ROUTE_LAYER_ID}
                type="line"
                layout={ROUTE_LINE_LAYOUT}
                paint={ROUTE_LINE_PAINT}
              />
            </Source>
          )}
        {/* User location marker - only show if showUserLocation is enabled */}
        {showUserLocation &&
          userLocation &&
          typeof userLocation.lat === "number" &&
          typeof userLocation.lng === "number" && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
              <div
                style={{
                  position: "relative",
                  width: 50,
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
              >
                {/* Pulsing circle animation - centered */}
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
                {/* User location marker - person icon (emoji) - centered on pulsing circle */}
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
                    color: "white",
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1001,
                    animation: "personPulse 2s ease-in-out infinite",
                    boxSizing: "border-box",
                  }}
                >
                  👤
                </div>
                {/* Label - centered horizontally with person icon center, very close to top of person icon circle */}
                <div
                  style={{
                    position: "absolute",
                    top: "32.5%",
                    left: "50%",
                    transform: "translate(calc(-50% + 17.5px), -100%)",
                    background:
                      "linear-gradient(135deg, rgba(251, 191, 36, 0.98) 0%, rgba(245, 158, 11, 0.98) 100%)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    padding: "6px 14px",
                    borderRadius: 12,
                    fontSize: "clamp(13px, 3vw, 15px)",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    boxShadow:
                      "0 4px 16px rgba(251, 191, 36, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                    pointerEvents: "none",
                    color: "#1f2937",
                    border: "1.5px solid rgba(255, 255, 255, 0.5)",
                    zIndex: 1002,
                    boxSizing: "border-box",
                    letterSpacing: "0.01em",
                    marginBottom: "4px",
                  }}
                >
                  {t("public.yourLocation")}
                  {/* Small pointer arrow pointing down to the icon - centered on label */}
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

        {/* Main marker (editable location) */}
        {currentLat && currentLng && onLocationChange && (
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
                background: "#1b1730",
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
        {visibleMarkers.map((marker) => {
          const zoomLevel = getZoomLevel(viewState.zoom);
          // Name chip when zoomed in; enhanced card on desktop hover / touch pin / route select
          const showLabel = zoomLevel === "close" && marker.name;
          const isClickable = !!marker.onClick;
          const isSelected = selectedMarkerId === marker.id;
          const isHovered = hoveredMarkerId === marker.id;
          const isPinned = pinnedMarkerId === marker.id;
          const showEnhancedCard = isSelected || isHovered || isPinned;
          const showZoomChip =
            !showEnhancedCard && showLabel && (!!marker.name || !!marker.category);
          const destinationReady = Number.isFinite(marker.lat) && Number.isFinite(marker.lng);
          const showDirections = destinationReady && showEnhancedCard;
          const cardImageUrl = showEnhancedCard
            ? sanitizeImageUrl(marker.mapImage) || sanitizeImageUrl(marker.heroImage) || null
            : null;

          return (
            <Marker
              key={marker.id}
              longitude={marker.lng}
              latitude={marker.lat}
              anchor={zoomLevel === "close" ? "bottom" : "center"}
              style={{ zIndex: isSelected || isHovered || isPinned ? 5 : 1 }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={() => {
                  if (canHoverPreview) setHoveredMarkerId(marker.id);
                }}
                onMouseLeave={() => {
                  // Hover preview only — never clear sticky selection.
                  if (!canHoverPreview) return;
                  setHoveredMarkerId((current) => (current === marker.id ? null : current));
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  suppressNextMapClick();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  suppressNextMapClick();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  suppressNextMapClick();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(marker, e as any);
                }}
              >
                <PlaceMapPin
                  zoomLevel={zoomLevel}
                  isSelected={isSelected}
                  isHovered={isHovered || isPinned}
                  isMuted={!isClickable}
                />

                {(showEnhancedCard || showZoomChip) && (
                  <div
                    className={[
                      "hl-map-marker-card",
                      showEnhancedCard ? "hl-map-marker-card--enhanced" : "hl-map-marker-card--chip",
                      isSelected ? "hl-map-marker-card--selected" : "",
                      cardImageUrl ? "hl-map-marker-card--has-media" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      suppressNextMapClick();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      suppressNextMapClick();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      suppressNextMapClick();
                    }}
                    onClick={(e) => {
                      // Card media/body opens detail; Navigáció stops propagation itself.
                      e.stopPropagation();
                      suppressNextMapClick();
                      if (!isClickable || !marker.onClick) return;
                      marker.onClick();
                    }}
                    style={{
                      pointerEvents: showEnhancedCard ? "auto" : "none",
                      cursor: isClickable ? "pointer" : undefined,
                    }}
                  >
                    {cardImageUrl && (
                      <div className="hl-map-marker-card__media">
                        <img
                          className="hl-map-marker-card__img"
                          src={cardImageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="hl-map-marker-card__body">
                      {marker.name && (
                        <span
                          className="hl-map-marker-card__title"
                          role={isClickable ? "link" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (!isClickable || !marker.onClick) return;
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            e.stopPropagation();
                            marker.onClick();
                          }}
                        >
                          {marker.name}
                        </span>
                      )}
                      {marker.category && (
                        <span className="hl-map-marker-card__category">{marker.category}</span>
                      )}
                      {isSelected && (
                        <>
                          {marker.distance !== undefined && marker.distance <= MAX_DISTANCE_KM && (
                            <>
                              <span className="hl-map-marker-card__meta">
                                {marker.isRouteDistance ? "🛣️" : "📍"}{" "}
                                {formatDistance(marker.distance)}
                              </span>
                              <span className="hl-map-marker-card__meta hl-map-marker-card__meta--row">
                                {marker.walkingTime !== undefined && (
                                  <span>🚶 {formatWalkingTime(marker.walkingTime, t)}</span>
                                )}
                                {marker.cyclingTime !== undefined && (
                                  <span>🚴 {formatWalkingTime(marker.cyclingTime, t)}</span>
                                )}
                              </span>
                            </>
                          )}
                          {marker.distance !== undefined && marker.distance > MAX_DISTANCE_KM && (
                            <span className="hl-map-marker-card__meta is-muted">
                              {t("public.tooFarAway", { distance: MAX_DISTANCE_KM })}
                            </span>
                          )}
                          {marker.distance === undefined &&
                            loadingRoutes.has(marker.id) && (
                              <span className="hl-map-marker-card__meta is-muted">
                                ⏳ {t("public.calculatingRoute")}
                              </span>
                            )}
                        </>
                      )}
                      {showDirections && (
                        <DirectionsButton
                          label={t("public.startNavigation")}
                          onNavigate={() => {
                            suppressNextMapClick(1500);
                            startInAppNavigation({
                              id: marker.id,
                              lat: marker.lat,
                              lng: marker.lng,
                            });
                          }}
                        />
                      )}
                    </div>
                    {showDirections && (
                      <span className="hl-map-marker-card__bridge" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </ReactMapGl>

      {routeOverlayPath && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 4,
            overflow: "visible",
          }}
        >
          <path
            d={routeOverlayPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.92}
          />
        </svg>
      )}

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
            zIndex: isDraggingLocationControl ? 10000 : 1000, // Dynamic z-index: higher when dragging
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
            minWidth: "auto",
            minHeight: 48,
            transition: isDraggingLocationControl ? "none" : "box-shadow 0.2s ease",
            touchAction: "none",
          }}
          onMouseEnter={(e) => {
            if (isDesktop && !isDraggingLocationControl) {
              e.currentTarget.style.boxShadow =
                "0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDraggingLocationControl) {
              e.currentTarget.style.boxShadow =
                "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)";
            }
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: isDraggingLocationControl ? "grabbing" : "pointer",
              flex: 1,
              fontSize: 15,
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "white",
              whiteSpace: "nowrap",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "manipulation",
              margin: 0,
              padding: "10px 20px 10px 20px",
              background: "#1b1730",
              borderRadius: isDesktop ? 16 : 12,
              minHeight: 48,
              boxSizing: "border-box",
            }}
            onClick={(e) => {
              if (locationMovedRef.current) return;
              const checkbox = e.currentTarget.querySelector(
                'input[type="checkbox"]'
              ) as HTMLInputElement;
              if (checkbox && (e.target as HTMLElement).tagName !== "INPUT") {
                // Prevent default label behavior and manually toggle
                e.preventDefault();
                e.stopPropagation();
                checkbox.click(); // Trigger checkbox click which will fire onChange
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
                style={{
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                  margin: 0,
                  padding: 0,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  backgroundColor: showUserLocation ? "#c45c26" : "white",
                  border: "2px solid rgba(255, 255, 255, 0.8)",
                  borderRadius: 3,
                  position: "relative",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "rgba(255, 255, 255, 0.3)",
                  zIndex: 1,
                }}
                onChange={(e) => {
                  // Must call geolocation API directly in event handler to maintain user gesture context on iOS
                  const checked = e.target.checked;

                  if (checked) {
                    // User wants to enable location tracking
                    if (navigator.geolocation) {
                      // Request geolocation in user gesture context (required for iOS)
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          // Success: set location and enable tracking
                          setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                          });
                          setShowUserLocation(true);

                          // Start watching for updates
                          if (watchIdRef.current !== null) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                          }
                          watchIdRef.current = navigator.geolocation.watchPosition(
                            (updatedPosition) => {
                              setUserLocation({
                                lat: updatedPosition.coords.latitude,
                                lng: updatedPosition.coords.longitude,
                              });
                            },
                            (error) => {
                              console.warn("Geolocation watch error:", error);
                              if (error.code === error.PERMISSION_DENIED) {
                                setShowUserLocation(false);
                                setUserLocation(null);
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
                          // Permission denied or error - don't enable
                          console.warn("Geolocation error:", error);
                          setShowUserLocation(false);
                          setUserLocation(null);
                          // Reset checkbox state
                          e.target.checked = false;
                        },
                        {
                          enableHighAccuracy: true,
                          maximumAge: 300000,
                          timeout: 15000,
                        }
                      );
                    } else {
                      // Geolocation not available
                      console.warn("Geolocation not supported");
                      setShowUserLocation(false);
                      e.target.checked = false;
                    }
                  } else {
                    // User wants to disable location tracking
                    if (watchIdRef.current !== null) {
                      navigator.geolocation.clearWatch(watchIdRef.current);
                      watchIdRef.current = null;
                    }
                    setShowUserLocation(false);
                    setUserLocation(null);
                    setSelectedMarkerId(null);
                    setRoutes([]);
                    shouldHaveRoutesRef.current = false;
                    lastRouteFetchPosition.current = null;
                  }
                }}
                onClick={(e) => {
                  // Stop propagation to prevent triggering drag on checkbox click
                  e.stopPropagation();
                }}
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
                  <path
                    d="M2 6 L5 9 L10 2"
                    stroke="white"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                fontWeight: 500,
                lineHeight: 1,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("public.showMyLocation")}
            </span>
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
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          {t("admin.clickOrDragMarker")}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

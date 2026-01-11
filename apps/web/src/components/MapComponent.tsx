// src/components/MapComponent.tsx
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Map, { Marker, Source, Layer } from "react-map-gl";
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
    isRouteDistance?: boolean; // Whether distance is based on route or straight-line
  }>;
  userLocation?: { lat: number; lng: number } | null; // User's current location
  showRoutes?: boolean; // Whether to show routes to markers
  height?: number;
  interactive?: boolean;
  defaultZoom?: number;
  mapStyle?: "default" | "hand-drawn" | "pastel";
}

// Helper function to calculate distance in km using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to format distance
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

// Helper function to calculate walking time (average walking speed: 5 km/h = 83.33 m/min)
const calculateWalkingTime = (distanceKm: number): number => {
  const walkingSpeedKmh = 5; // km/h
  const timeHours = distanceKm / walkingSpeedKmh;
  return timeHours * 60; // Convert to minutes
};

// Helper function to calculate cycling time (average cycling speed: 15 km/h)
const calculateCyclingTime = (distanceKm: number): number => {
  const cyclingSpeedKmh = 15; // km/h
  const timeHours = distanceKm / cyclingSpeedKmh;
  return timeHours * 60; // Convert to minutes
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
}: MapComponentProps) {
  const { t } = useTranslation();
  const { showUserLocation, setShowUserLocation, userLocation: userLocationFromStore } = useFiltersStore();
  
  // Use userLocation from store if available, otherwise use prop
  const userLocation = userLocationFromStore || userLocationProp;
  const [routes, setRoutes] = useState<Array<{ coordinates: number[][]; markerId: string; distance?: number; duration?: number }>>([]);
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());
  const routesRef = useRef<Array<{ coordinates: number[][]; markerId: string; distance?: number; duration?: number }>>([]);
  const loadingRoutesRef = useRef<Set<string>>(new Set());
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  
  // Default positions: bal lent (bottom left) - using bottom instead of top
  const defaultPositionDesktop = { bottom: 100, left: 16 };
  const defaultPositionMobile = { bottom: 80, left: 12 };
  
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
  
  const [isDraggingLocationControl, setIsDraggingLocationControl] = useState(false);
  const [hasDraggedLocationControl, setHasDraggedLocationControl] = useState(false);
  const [dragOffsetLocationControl, setDragOffsetLocationControl] = useState({ x: 0, y: 0 });
  const locationControlRef = useRef<HTMLDivElement>(null);
  const dragStartPosLocationControlRef = useRef({ x: 0, y: 0 });
  
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
    if (locationControlPosition.bottom !== defaultPos.bottom || locationControlPosition.left !== defaultPos.left) {
      localStorage.setItem(`mapLocationControlPosition_${deviceKey}`, JSON.stringify(locationControlPosition));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`mapLocationControlPosition_${deviceKey}`);
    }
  }, [locationControlPosition, isDesktop]);
  
  // Handle dragging for location control - mouse
  const handleLocationControlMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !locationControlRef.current) return;
    // Don't allow dragging from the checkbox input itself (but allow from label)
    if ((e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLElement).type === "checkbox") {
      return;
    }
    e.preventDefault();
    setHasDraggedLocationControl(false);
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
    if ((e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLElement).type === "checkbox") {
      return;
    }
    e.preventDefault();
    setHasDraggedLocationControl(false);
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
      const moved = Math.abs(e.clientX - dragStartPosLocationControlRef.current.x) > 5 || Math.abs(e.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (moved) {
        setHasDraggedLocationControl(true);
      }
      if (locationControlRef.current) {
        const newX = e.clientX - dragOffsetLocationControl.x;
        const newY = e.clientY - dragOffsetLocationControl.y;
        const elementHeight = locationControlRef.current.offsetHeight || 50;
        // Convert top to bottom positioning
        const newBottom = window.innerHeight - newY - elementHeight;
        setLocationControlPosition({
          bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
          left: Math.max(0, Math.min(window.innerWidth - 200, newX)),
        });
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const moved = Math.abs(touch.clientX - dragStartPosLocationControlRef.current.x) > 5 || Math.abs(touch.clientY - dragStartPosLocationControlRef.current.y) > 5;
      if (moved) {
        setHasDraggedLocationControl(true);
      }
      if (locationControlRef.current) {
        const newX = touch.clientX - dragOffsetLocationControl.x;
        const newY = touch.clientY - dragOffsetLocationControl.y;
        const elementHeight = locationControlRef.current.offsetHeight || 50;
        // Convert top to bottom positioning
        const newBottom = window.innerHeight - newY - elementHeight;
        setLocationControlPosition({
          bottom: Math.max(0, Math.min(window.innerHeight - 50, newBottom)),
          left: Math.max(0, Math.min(window.innerWidth - 200, newX)),
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingLocationControl(false);
    };
    
    const handleTouchEnd = () => {
      setIsDraggingLocationControl(false);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    
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
    const propsChanged = prevLatPropRef.current !== latitude || 
                        prevLngPropRef.current !== longitude || 
                        prevZoomPropRef.current !== defaultZoom;
    
    // On initial mount, set the viewState from props
    if (isInitialMount.current && latitude != null && longitude != null) {
      console.log("MapComponent: Initial mount, setting viewState from props:", { latitude, longitude, defaultZoom });
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
      console.log("MapComponent: Props changed, forcing viewState update:", { latitude, longitude, defaultZoom, "prevLatProp": prevLatPropRef.current, "prevLngProp": prevLngPropRef.current, "prevZoomProp": prevZoomPropRef.current });
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
          console.log("MapComponent: Updating viewState from props:", { latitude, longitude, defaultZoom, "prevLat": prevLat, "prevLng": prevLng, "latDiff": latDiff, "lngDiff": lngDiff });
          setViewState((prev) => ({
            ...prev,
            latitude,
            longitude,
            zoom: defaultZoom, // Also update zoom when center changes
          }));
          prevZoomRef.current = defaultZoom;
        } else {
          console.log("MapComponent: Skipping update (difference too small):", { latitude, longitude, "prevLat": prevLat, "prevLng": prevLng, "latDiff": latDiff, "lngDiff": lngDiff });
        }
      } else {
        // First time setting coordinates
        console.log("MapComponent: Setting initial viewState from props:", { latitude, longitude, defaultZoom });
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
      console.log("MapComponent: Updating zoom:", defaultZoom);
      setViewState((prev) => ({
        ...prev,
        zoom: defaultZoom,
      }));
      prevZoomRef.current = defaultZoom;
    }
  }, [defaultZoom]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      // Deselect marker when clicking on map
      if (selectedMarkerId) {
        console.log("Map clicked, deselecting marker:", selectedMarkerId);
        setSelectedMarkerId(null);
      }
      
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
    [interactive, onLocationChange, selectedMarkerId],
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
    [onLocationChange],
  );

  const handleDragEnd = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      isDraggingRef.current = false;
      if (!onLocationChange) return;
      const { lng, lat } = event.lngLat;
      // Final update when drag ends
      onLocationChange(lat, lng);
    },
    [onLocationChange],
  );

  // Use props if available, otherwise use viewState (for initial load)
  // But only update from props if they're different from current viewState
  // to avoid jumping during drag operations
  const currentLat = latitude != null ? latitude : viewState.latitude;
  const currentLng = longitude != null ? longitude : viewState.longitude;

  // Fetch route from user location to marker using OSRM (Open Source Routing Machine)
  // OSRM is free and doesn't require an API key
  const fetchRoute = useCallback(async (markerLat: number, markerLng: number, markerId: string) => {
    if (!userLocation) {
      console.warn("Cannot fetch route: userLocation is null");
      return;
    }
    
    console.log("fetchRoute called for marker:", markerId, "from:", userLocation, "to:", markerLat, markerLng);
    setLoadingRoutes(prev => new Set(prev).add(markerId));
    
    try {
      // Using OSRM (Open Source Routing Machine) - free, no API key needed
      // Using the public OSRM demo server
      const start = `${userLocation.lng},${userLocation.lat}`;
      const end = `${markerLng},${markerLat}`;
      const profile = "driving"; // Can be: driving, walking, cycling
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson`
      );
      
      if (!response.ok) {
        console.warn(`OSRM API failed for marker ${markerId}:`, response.status, response.statusText);
        // Remove route if API fails - don't show straight line
        setRoutes(prev => prev.filter(r => r.markerId !== markerId));
        return;
      }
      
      const data = await response.json();
      
      if (data.code === "Ok" && data.routes && data.routes[0] && data.routes[0].geometry) {
        const coordinates = data.routes[0].geometry.coordinates;
        const distance = data.routes[0].distance / 1000; // Convert meters to km
        const duration = data.routes[0].duration / 60; // Convert seconds to minutes (for driving)
        // For walking, calculate based on distance
        const walkingDuration = calculateWalkingTime(distance);
        
        const newRoute = {
          coordinates,
          markerId,
          distance, // Store route distance
          duration: walkingDuration, // Store walking duration
        };
        
        setRoutes(prev => {
          const filtered = prev.filter(r => r.markerId !== markerId);
          const updated = [...filtered, newRoute];
          console.log(`Route fetched successfully for marker ${markerId}, distance: ${distance.toFixed(2)} km, walking time: ${walkingDuration.toFixed(1)} min. Routes array length: ${updated.length}`);
          return updated;
        });
        
        // Remove from loading set
        setLoadingRoutes(prev => {
          const updated = new Set(prev);
          updated.delete(markerId);
          return updated;
        });
      } else {
        console.warn(`OSRM returned error for marker ${markerId}:`, data.code);
        setRoutes(prev => prev.filter(r => r.markerId !== markerId));
      }
    } catch (error) {
      console.warn(`Failed to fetch route for marker ${markerId}:`, error);
      // Don't show straight line - just remove the route
      setRoutes(prev => prev.filter(r => r.markerId !== markerId));
    } finally {
      setLoadingRoutes(prev => {
        const next = new Set(prev);
        next.delete(markerId);
        return next;
      });
    }
  }, [userLocation]);

  // Fetch routes only for selected marker and if showUserLocation is enabled
  useEffect(() => {
    console.log("Route fetch effect triggered - selectedMarkerId:", selectedMarkerId, "userLocation:", userLocation, "showUserLocation:", showUserLocation, "markers count:", markers.length);
    
    if (showUserLocation && selectedMarkerId && userLocation && userLocation.lat && userLocation.lng) {
      const selectedMarker = markers.find(m => m.id === selectedMarkerId);
      console.log("Selected marker found:", selectedMarker);
      
      if (selectedMarker && selectedMarker.lat && selectedMarker.lng) {
        // Only fetch if route doesn't exist yet (using refs to avoid dependency issues)
        const existingRoute = routesRef.current.find(r => r.markerId === selectedMarkerId);
        const isLoading = loadingRoutesRef.current.has(selectedMarkerId);
        
        console.log("Route check - existingRoute:", existingRoute, "isLoading:", isLoading);
        
        if (!existingRoute && !isLoading) {
          console.log("Fetching route for selected marker:", selectedMarkerId, "from", userLocation, "to", selectedMarker.lat, selectedMarker.lng);
          fetchRoute(selectedMarker.lat, selectedMarker.lng, selectedMarkerId);
        } else {
          console.log("Route already exists or is loading, skipping fetch");
        }
      } else {
        console.warn("Selected marker not found or missing coordinates in markers array");
      }
    } else {
      // Clear routes when no marker is selected or showUserLocation is disabled
      console.log("No marker selected or no userLocation or showUserLocation disabled, clearing routes. selectedMarkerId:", selectedMarkerId, "userLocation:", userLocation, "showUserLocation:", showUserLocation);
      setRoutes([]);
    }
  }, [selectedMarkerId, userLocation, markers, fetchRoute, showUserLocation]);

  // Debug: log userLocation (always log for debugging)
  useEffect(() => {
    console.log("MapComponent - userLocation prop:", userLocation);
    console.log("MapComponent - userLocation check:", userLocation && userLocation.lat && userLocation.lng);
    if (userLocation) {
      console.log("MapComponent received userLocation:", userLocation);
      console.log("MapComponent - Will render marker at:", userLocation.lat, userLocation.lng);
    } else {
      console.log("MapComponent: userLocation is null/undefined");
    }
  }, [userLocation]);

  // Calculate distances for markers
  // Use route distance if available, otherwise use straight-line distance
  // Only calculate if showUserLocation is enabled
  const markersWithDistance = useMemo(() => {
    if (!showUserLocation || !userLocation) return markers;
    
    return markers.map(marker => {
      // Check if we have a route distance for this marker
      const route = routes.find(r => r.markerId === marker.id);
      const distance = route?.distance ?? calculateDistance(userLocation.lat, userLocation.lng, marker.lat, marker.lng);
      const walkingTime = route?.duration ?? calculateWalkingTime(distance);
      const cyclingTime = calculateCyclingTime(distance);
      
      return {
        ...marker,
        distance,
        walkingTime,
        cyclingTime,
        isRouteDistance: !!route?.distance, // Flag to indicate if this is route distance or straight-line
      };
    });
  }, [markers, userLocation, routes]);

  // Handle marker click - behavior depends on showUserLocation
  // If showUserLocation is false: navigate immediately (single click)
  // If showUserLocation is true: first click selects, second click navigates (two-click)
  const handleMarkerClick = useCallback((marker: typeof markersWithDistance[0], event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent map click
    event.preventDefault(); // Prevent default behavior
    
    console.log("handleMarkerClick called for marker:", marker.id, "showUserLocation:", showUserLocation, "current selectedMarkerId:", selectedMarkerId, "has onClick:", !!marker.onClick);
    
    if (!showUserLocation) {
      // If user location is disabled, navigate immediately on first click
      console.log("User location disabled, navigating immediately:", marker.id);
      if (marker.onClick) {
        setTimeout(() => {
          try {
            marker.onClick();
          } catch (error) {
            console.error("Error during navigation:", error);
          }
        }, 0);
      }
      return;
    }
    
    // If user location is enabled, use two-click behavior
    if (selectedMarkerId === marker.id) {
      // Second click on same marker - navigate (only if onClick exists)
      console.log("Second click on marker, navigating:", marker.id);
      if (marker.onClick) {
        console.log("Calling marker.onClick() for navigation");
        setTimeout(() => {
          try {
            marker.onClick();
          } catch (error) {
            console.error("Error during navigation:", error);
          }
        }, 0);
      } else {
        console.warn("Marker has no onClick callback, cannot navigate");
      }
    } else {
      // First click - select marker (always works, even without onClick)
      console.log("First click on marker, selecting:", marker.id);
      setSelectedMarkerId(marker.id);
    }
  }, [selectedMarkerId, markersWithDistance, showUserLocation]);

  // Memoize map style to prevent re-initialization on every render
  const memoizedMapStyle = useMemo(() => {
    if (mapStyle === "hand-drawn") {
      return {
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
      };
    } else if (mapStyle === "pastel") {
      return {
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
      };
    } else {
      return {
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
      };
    }
  }, [mapStyle]);

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
        mapStyle={memoizedMapStyle}
        cursor={interactive && onLocationChange ? "crosshair" : "default"}
        dragRotate={false}
        touchZoomRotate={false}
        transitionDuration={300}
      >
        {/* User location marker - only show if showUserLocation is enabled */}
        {showUserLocation && userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number" && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="bottom"
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 1000,
              }}
            >
              {/* Pulsing circle animation */}
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
              {/* User location marker - person icon (emoji) */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "4px solid white",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: "white",
                  fontWeight: "bold",
                  position: "relative",
                  zIndex: 1001,
                }}
              >
                👤
              </div>
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(102, 126, 234, 0.95)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  pointerEvents: "none",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  zIndex: 1002,
                }}
              >
                {t("public.yourLocation")}
              </div>
            </div>
          </Marker>
        )}

        {/* Route lines from user location to selected marker only - only show if showUserLocation is enabled */}
        {showUserLocation && selectedMarkerId && userLocation && routes.length > 0 && routes.map((route) => {
          console.log("Rendering route for marker:", route.markerId, "coordinates count:", route.coordinates.length);
          return (
            <Source
              key={`route-${route.markerId}`}
              id={`route-${route.markerId}`}
              type="geojson"
              data={{
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: route.coordinates,
                },
              }}
            >
              <Layer
                id={`route-layer-${route.markerId}`}
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#3b82f6",
                  "line-width": 6,
                  "line-opacity": 0.8,
                }}
              />
            </Source>
          );
        })}

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
        {markersWithDistance.map((marker) => {
          // Show labels only when zoomed in (zoom >= 13) - but NOT distance unless selected
          const showLabel = viewState.zoom >= 13 && marker.name;
          const isClickable = !!marker.onClick;
          const isSelected = selectedMarkerId === marker.id;
          
          return (
            <Marker
              key={marker.id}
              longitude={marker.lng}
              latitude={marker.lat}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  console.log("Marker div clicked:", marker.id, "isClickable:", isClickable);
                  e.stopPropagation(); // Prevent map click
                  e.preventDefault(); // Prevent default
                  handleMarkerClick(marker, e as any);
                }}
                onMouseDown={(e) => {
                  // Also stop propagation on mousedown to prevent map click
                  e.stopPropagation();
                }}
              >
                {/* Modern marker pin design */}
                <div
                  style={{
                    width: isSelected ? 28 : 24,
                    height: isSelected ? 28 : 24,
                    borderRadius: "50% 50% 50% 0",
                    background: isSelected
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : isClickable 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "linear-gradient(135deg, #999 0%, #777 100%)",
                    border: isSelected ? "4px solid white" : "3px solid white",
                    boxShadow: isSelected
                      ? "0 6px 16px rgba(245, 158, 11, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)"
                      : isClickable
                      ? "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)"
                      : "0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)",
                    cursor: isClickable ? "pointer" : "default",
                    transform: isSelected ? "rotate(-45deg) scale(1.2)" : "rotate(-45deg)",
                    transition: "all 0.2s ease",
                    opacity: isClickable ? 1 : 0.7,
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable && !isSelected) {
                      e.currentTarget.style.transform = "rotate(-45deg) scale(1.15)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = isSelected ? "rotate(-45deg) scale(1.2)" : "rotate(-45deg) scale(1)";
                      e.currentTarget.style.boxShadow = isSelected
                        ? "0 6px 16px rgba(245, 158, 11, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)"
                        : isClickable
                        ? "0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)"
                        : "0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)";
                    }
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
                
                {/* Label - shows name when zoomed in, distance and walking time ONLY when selected */}
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
                      whiteSpace: "nowrap",
                      boxShadow: isSelected
                        ? "0 4px 12px rgba(245, 158, 11, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
                        : "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)",
                      marginBottom: 8,
                      pointerEvents: "none",
                      color: "#1a1a1a",
                      border: isSelected 
                        ? "2px solid rgba(245, 158, 11, 1)"
                        : "1px solid rgba(0, 0, 0, 0.05)",
                      letterSpacing: "-0.01em",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: isSelected ? 4 : 2,
                      minWidth: isSelected ? 120 : "auto",
                    }}
                  >
                    {marker.name && !isSelected && (
                      <span style={{ fontWeight: 500 }}>
                        {marker.name}
                      </span>
                    )}
                    {isSelected && (
                      <>
                        {marker.name && (
                          <span style={{ fontWeight: 600 }}>
                            {marker.name}
                          </span>
                        )}
                        {marker.distance !== undefined && marker.distance <= MAX_DISTANCE_KM && (
                          <>
                            <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.95 }}>
                              {marker.isRouteDistance ? "🛣️" : "📍"} {formatDistance(marker.distance)}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.9, display: "flex", gap: 8, alignItems: "center" }}>
                              {marker.walkingTime !== undefined && (
                                <span>🚶 {formatWalkingTime(marker.walkingTime, t)}</span>
                              )}
                              {marker.cyclingTime !== undefined && (
                                <span>🚴 {formatWalkingTime(marker.cyclingTime, t)}</span>
                              )}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, marginTop: 2 }}>
                              {t("public.clickAgainToNavigate")}!
                            </span>
                          </>
                        )}
                        {marker.distance !== undefined && marker.distance > MAX_DISTANCE_KM && (
                          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, fontStyle: "italic" }}>
                            {t("public.tooFarAway", { distance: MAX_DISTANCE_KM })}
                          </span>
                        )}
                        {marker.distance === undefined && (
                          <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                            {t("public.clickAgainToNavigate")}
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
      </Map>
      
      {/* Draggable user location control */}
      <div
        ref={locationControlRef}
        onMouseDown={handleLocationControlMouseDown}
        onTouchStart={handleLocationControlTouchStart}
        style={{
          position: "absolute",
          bottom: locationControlPosition.bottom,
          left: locationControlPosition.left,
          zIndex: 1000,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "10px 14px",
          cursor: isDesktop ? (isDraggingLocationControl ? "grabbing" : "grab") : "default",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: "auto",
          transition: isDraggingLocationControl ? "none" : "box-shadow 0.2s ease",
          touchAction: "none",
        }}
        onMouseEnter={(e) => {
          if (isDesktop && !isDraggingLocationControl) {
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(0, 0, 0, 0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDraggingLocationControl) {
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(0, 0, 0, 0.08)";
          }
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: isDesktop ? (isDraggingLocationControl ? "grabbing" : "grab") : "pointer",
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: "white",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <input
              type="checkbox"
              checked={showUserLocation}
              onChange={(e) => {
                console.log("Checkbox changed:", e.target.checked);
                setShowUserLocation(e.target.checked);
              }}
              onClick={(e) => {
                // Prevent drag when clicking directly on checkbox
                e.stopPropagation();
              }}
              style={{
                width: 18,
                height: 18,
                cursor: "pointer",
                margin: 0,
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundColor: "white",
                border: "2px solid rgba(255, 255, 255, 0.5)",
                borderRadius: 3,
                position: "relative",
              }}
            />
            {showUserLocation && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 12,
                  height: 12,
                  pointerEvents: "none",
                }}
              >
                <svg viewBox="0 0 12 12" style={{ width: "100%", height: "100%" }}>
                  <path
                    d="M2 6 L5 9 L10 2"
                    stroke="#667eea"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          <span>{t("public.yourLocation") || "Saját helyzet"}</span>
        </label>
      </div>
      
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


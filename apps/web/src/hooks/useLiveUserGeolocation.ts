import { useEffect, useRef } from "react";
import { useFiltersStore } from "../stores/useFiltersStore";
import {
  GEO_FRESH,
  GEO_WATCH,
  clearGeoWatch,
  coordsFromPosition,
} from "../lib/geolocation";

type Options = {
  /** When false, no GPS work (admin maps, location toggle off). */
  enabled: boolean;
};

/**
 * Keeps `userLocation` current while "show my location" is on:
 * - fresh fix on enable / mount
 * - watchPosition while the page is open (movement)
 * - re-fix when a PWA / tab becomes visible again (iOS home-screen resume)
 *
 * First-time permission still needs a user gesture (checkbox); after grant,
 * resume refreshes work without another tap.
 */
export function useLiveUserGeolocation({ enabled }: Options): void {
  const setUserLocation = useFiltersStore((s) => s.setUserLocation);
  const setShowUserLocation = useFiltersStore((s) => s.setShowUserLocation);
  const watchIdRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      clearGeoWatch(watchIdRef.current);
      watchIdRef.current = null;
      return;
    }

    const onDenied = () => {
      clearGeoWatch(watchIdRef.current);
      watchIdRef.current = null;
      setShowUserLocation(false);
      setUserLocation(null);
    };

    const startWatch = () => {
      clearGeoWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation(coordsFromPosition(position));
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) onDenied();
        },
        GEO_WATCH
      );
    };

    const refreshNow = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          refreshingRef.current = false;
          setUserLocation(coordsFromPosition(position));
          startWatch();
        },
        (error) => {
          refreshingRef.current = false;
          if (error.code === error.PERMISSION_DENIED) {
            onDenied();
            return;
          }
          // Transient error: keep last known pin, still watch for movement.
          startWatch();
        },
        GEO_FRESH
      );
    };

    refreshNow();

    const onResume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshNow();
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      refreshingRef.current = false;
      clearGeoWatch(watchIdRef.current);
      watchIdRef.current = null;
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [enabled, setUserLocation, setShowUserLocation]);
}

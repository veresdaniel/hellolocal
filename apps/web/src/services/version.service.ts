// src/services/version.service.ts
import { APP_VERSION } from "../app/config";

export interface VersionInfo {
  version: string;
  buildHash: string;
  timestamp: number;
}

const VERSION_STORAGE_KEY = "hellolocal_app_version";
const VERSION_CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 minutes (reduced frequency)
const VERSION_JSON_PATH = "/version.json";

/**
 * Get current stored version from localStorage
 */
export function getStoredVersion(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VERSION_STORAGE_KEY);
}

/**
 * Store current version in localStorage
 */
export function storeVersion(version: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VERSION_STORAGE_KEY, version);
}

// Throttle version.json requests - cache last fetch time
let lastFetchTime = 0;
let cachedVersion: VersionInfo | null = null;
const FETCH_THROTTLE = 60 * 1000; // Max 1 request per minute

/**
 * Fetch version info from server (with throttling)
 */
export async function fetchVersionInfo(forceRefresh = false): Promise<VersionInfo | null> {
  const now = Date.now();
  
  // Return cached version if we fetched recently and not forcing refresh
  if (!forceRefresh && cachedVersion && (now - lastFetchTime < FETCH_THROTTLE)) {
    return cachedVersion;
  }

  try {
    // Only use cache-busting on first fetch or forced refresh
    const cacheBust = forceRefresh || !cachedVersion ? `?t=${Date.now()}` : '';
    const response = await fetch(`${VERSION_JSON_PATH}${cacheBust}`, {
      cache: cachedVersion ? 'default' : 'no-store',
      headers: cachedVersion ? {} : {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) {
      console.warn("[VersionService] Failed to fetch version.json:", response.status);
      return cachedVersion; // Return cached version on error
    }
    const data = await response.json();
    const versionInfo: VersionInfo = {
      version: data.version || APP_VERSION,
      buildHash: data.buildHash || "",
      timestamp: data.timestamp || Date.now(),
    };
    
    // Cache the result
    cachedVersion = versionInfo;
    lastFetchTime = now;
    
    return versionInfo;
  } catch (error) {
    console.warn("[VersionService] Error fetching version info:", error);
    return cachedVersion; // Return cached version on error
  }
}

/**
 * Check if version has changed
 */
export async function checkVersionChange(): Promise<boolean> {
  const storedVersion = getStoredVersion();
  const serverVersionInfo = await fetchVersionInfo();
  
  if (!serverVersionInfo) {
    // If we can't fetch version, assume no change
    return false;
  }

  // If no stored version, this is first load - store it and return false
  if (!storedVersion) {
    storeVersion(serverVersionInfo.version);
    return false;
  }

  // Check if version changed
  if (storedVersion !== serverVersionInfo.version) {
    return true;
  }

  return false;
}

/**
 * Clear all caches (localStorage, sessionStorage, service worker, browser cache)
 */
export async function clearAllCaches(): Promise<void> {

  // Clear localStorage (except version and auth-related data)
  const keysToKeep = [
    VERSION_STORAGE_KEY,
    "i18nextLng",
    "auth_token",
    "refresh_token",
    "publicAuthBadgePosition",
  ];
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear service worker caches
  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    } catch (error) {
      console.warn("[VersionService] Error clearing service worker caches:", error);
    }
  }

  // Unregister service worker to force reload
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    } catch (error) {
      console.warn("[VersionService] Error unregistering service workers:", error);
    }
  }

  // Clear browser cache hints (this is best effort)
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      await navigator.storage.estimate();
    } catch (error) {
      console.warn("[VersionService] Error estimating storage:", error);
    }
  }
}

/**
 * Handle version update - clear caches and reload
 */
export async function handleVersionUpdate(newVersion: string): Promise<void> {
  
  // Store new version
  storeVersion(newVersion);
  
  // Clear all caches
  await clearAllCaches();
  
  // Reload the page after a short delay to allow toast to be visible
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

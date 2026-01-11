// src/services/version.service.ts
import { APP_VERSION } from "../app/config";

export interface VersionInfo {
  version: string;
  buildHash: string;
  timestamp: number;
}

const VERSION_STORAGE_KEY = "hellolocal_app_version";
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
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

/**
 * Fetch version info from server
 */
export async function fetchVersionInfo(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`${VERSION_JSON_PATH}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) {
      console.warn("[VersionService] Failed to fetch version.json:", response.status);
      return null;
    }
    const data = await response.json();
    return {
      version: data.version || APP_VERSION,
      buildHash: data.buildHash || "",
      timestamp: data.timestamp || Date.now(),
    };
  } catch (error) {
    console.warn("[VersionService] Error fetching version info:", error);
    return null;
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
  console.log("[VersionService] Clearing all caches...");

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
      console.log("[VersionService] Service worker caches cleared");
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
      console.log("[VersionService] Service workers unregistered");
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
  console.log(`[VersionService] Version update detected: ${getStoredVersion()} -> ${newVersion}`);
  
  // Store new version
  storeVersion(newVersion);
  
  // Clear all caches
  await clearAllCaches();
  
  // Reload the page after a short delay to allow toast to be visible
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

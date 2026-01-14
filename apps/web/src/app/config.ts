// src/app/config.ts
// Re-export from centralized enums
import { LANG_VALUES, type Lang } from "../types/enums";
export { LANG_VALUES as APP_LANGS, type Lang };
export const DEFAULT_LANG: Lang = "hu";

// most 1 site van:
export const DEFAULT_SITE_SLUG = "etyek-budai";

// ha később több site lesz (Mockoon /sites alapján), ezt true-ra állítod runtime:
export const HAS_MULTIPLE_SITES = true;

// App version - automatically read from package.json at build time
// This is used for version checking and cache invalidation
// The version is injected by Vite during build from package.json via define plugin
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.1.0-beta";

// Maximum distance in km to show distance information for markers
// Can be overridden with VITE_MAX_DISTANCE_KM environment variable
export const MAX_DISTANCE_KM = parseInt(
  import.meta.env.VITE_MAX_DISTANCE_KM || "10",
  10
);

// API Configuration
export const DEFAULT_BACKEND_URL = "http://localhost:3002";

// Timing Constants (in milliseconds)
export const TIMING = {
  // Session and authentication
  SESSION_WARNING_THRESHOLD_MS: 30 * 1000, // 30 seconds before expiration
  SESSION_CHECK_INTERVAL_MS: 1000, // Check session every second
  TOKEN_CHECK_INTERVAL_MS: 10 * 1000, // Check token every 10 seconds
  SESSION_EXTEND_DEBOUNCE_MS: 5 * 1000, // 5 seconds debounce for session extension
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes - refresh token if expires within this time
  
  // UI updates
  UI_UPDATE_INTERVAL_MS: 1000, // Update UI every second (for countdowns, etc.)
  FOCUS_DEBOUNCE_MS: 1000, // 1 second debounce for focus events
  FOCUS_CHECK_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes threshold for focus checks
  
  // Navigation and events
  NAVIGATION_DELAY_MS: 300, // Delay for navigation events (e.g., map view switch)
  DRAG_RESET_DELAY_MS: 100, // Delay before resetting drag flag to allow click
  
  // Version checking
  VERSION_CHECK_INTERVAL_MS: 5 * 60 * 1000, // Check for updates every 5 minutes
} as const;

// src/app/config.ts
export const APP_LANGS = ["hu", "en", "de"] as const;
export type Lang = (typeof APP_LANGS)[number];

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

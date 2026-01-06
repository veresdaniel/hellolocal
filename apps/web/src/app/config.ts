// src/app/config.ts
export const APP_LANGS = ["hu", "en", "de"] as const;
export type Lang = (typeof APP_LANGS)[number];

export const DEFAULT_LANG: Lang = "hu";

// most 1 tenant van:
export const DEFAULT_TENANT_SLUG = "etyek-budai";

// ha később több tenant lesz (Mockoon /tenants alapján), ezt true-ra állítod runtime:
export const HAS_MULTIPLE_TENANTS = false;

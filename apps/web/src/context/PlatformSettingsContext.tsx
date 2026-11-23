/**
 * Public-site platform settings context (locale, branding, SEO defaults, feature matrix, …).
 * Populated by the site outlet after `/api/public/:lang/:siteKey/platform` loads.
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { PlatformSettings } from "../app/site/SiteOutletContext";

const PlatformSettingsContext = createContext<PlatformSettings | null>(null);

/** Provide resolved {@link PlatformSettings} for the active public site tree. */
export function PlatformSettingsProvider(props: { value: PlatformSettings; children: ReactNode }) {
  return (
    <PlatformSettingsContext.Provider value={props.value}>
      {props.children}
    </PlatformSettingsContext.Provider>
  );
}

/** Required consumer — throws when used outside {@link PlatformSettingsProvider}. */
export function usePlatformSettingsContext() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx)
    throw new Error("usePlatformSettingsContext must be used within PlatformSettingsProvider");
  return ctx;
}

/** Optional consumer — returns null when the provider is absent (e.g. admin chrome). */
export function usePlatformSettingsContextOptional() {
  return useContext(PlatformSettingsContext);
}

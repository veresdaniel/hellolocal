// src/context/PlatformSettingsContext.tsx
import React, { createContext, useContext } from "react";
import type { PlatformSettings } from "../app/site/SiteOutletContext";

const PlatformSettingsContext = createContext<PlatformSettings | null>(null);

export function PlatformSettingsProvider(props: { value: PlatformSettings; children: React.ReactNode }) {
  return <PlatformSettingsContext.Provider value={props.value}>{props.children}</PlatformSettingsContext.Provider>;
}

export function usePlatformSettingsContext() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error("usePlatformSettingsContext must be used within PlatformSettingsProvider");
  return ctx;
}

// Optional version that returns null if context is not available
export function usePlatformSettingsContextOptional() {
  return useContext(PlatformSettingsContext);
}

// src/app/site/useSiteContext.ts
import { useParams } from "react-router-dom";
import { useRouteCtx } from "../useRouteCtx";
import type { SiteOutletContext } from "./SiteOutletContext";

/**
 * Hook to get site context (lang, siteKey, platform).
 *
 * This hook tries to get context from outlet context first, but falls back
 * to URL params if outlet context is not available. This makes it safe to
 * use in components that may or may not be inside an Outlet.
 *
 * Note: We use useRouteCtx instead of useOutletContext to avoid hook errors
 * when the component is not inside an Outlet. The platform settings can be
 * loaded separately using useQuery if needed.
 */
export function useSiteContext(): Partial<SiteOutletContext> {
  // Use useRouteCtx which safely gets lang and siteKey from URL params
  // This avoids the "Invalid hook call" error when not inside an Outlet
  const { lang, siteKey } = useRouteCtx();

  // Return context with platform as undefined (can be loaded separately if needed)
  return {
    lang,
    siteKey,
    platform: undefined, // Platform settings should be loaded via useQuery if needed
  };
}

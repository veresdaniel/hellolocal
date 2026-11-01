import { hasVisibleHtml } from "./hasVisibleHtml";
import { sanitizeImageUrl } from "./urlValidation";
import { useViewStore } from "../stores/useViewStore";

const EXPLORE_KEY = "hl-explore";

export type SiteLandingContent = {
  name: string;
  hero: string | null;
  html: string;
};

type LandingSite = {
  name?: string | null;
  heroImage?: string | null;
  landingHtml?: string | null;
};

/**
 * The opening page is published only when this language has visible HTML.
 * heroImage alone does not count: existing regions already use it on the
 * area card, and a missing landingHtml (old API, or not migrated yet) must
 * keep the map.
 */
export function readSiteLanding(site?: LandingSite | null): SiteLandingContent | null {
  const html = site?.landingHtml;
  if (!hasVisibleHtml(html)) return null;
  return {
    name: site?.name?.trim() || "",
    hero: sanitizeImageUrl(site?.heroImage),
    html: html as string,
  };
}

export function peekExploreRequest(): "map" | "list" | null {
  if (typeof sessionStorage === "undefined") return null;
  const mode = sessionStorage.getItem(EXPLORE_KEY);
  return mode === "map" || mode === "list" ? mode : null;
}

export function clearExploreRequest() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(EXPLORE_KEY);
}

/** Leave the opening page for the map or the list, including across navigation. */
export function openSiteExplore(mode: "map" | "list") {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(EXPLORE_KEY, mode);
  }
  useViewStore.getState().setShowMap(mode === "map");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(mode === "map" ? "showMapView" : "showListView"));
  }
}

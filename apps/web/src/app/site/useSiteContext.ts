// src/app/site/useSiteContext.ts
import { useOutletContext } from "react-router-dom";
import type { SiteOutletContext } from "./SiteOutletContext";

export function useSiteContext() {
  return useOutletContext<SiteOutletContext>();
}

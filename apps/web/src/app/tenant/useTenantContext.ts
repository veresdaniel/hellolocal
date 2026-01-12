// src/app/tenant/useTenantContext.ts
import { useOutletContext } from "react-router-dom";
import type { SiteOutletContext, TenantOutletContext } from "./TenantOutletContext";

export function useSiteContext() {
  return useOutletContext<SiteOutletContext>();
}

// Backward compatibility
export function useTenantContext() {
  const context = useOutletContext<SiteOutletContext | TenantOutletContext>();
  // If context has siteKey, use it; otherwise fall back to tenantKey
  return {
    ...context,
    siteKey: (context as any).siteKey || (context as any).tenantKey,
    tenantKey: (context as any).tenantKey || (context as any).siteKey,
  };
}

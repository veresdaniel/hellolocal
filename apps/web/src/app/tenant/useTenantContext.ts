// src/app/tenant/useTenantContext.ts
import { useOutletContext } from "react-router-dom";
import type { TenantOutletContext } from "./TenantContext";
import { DEFAULT_TENANT_SLUG, DEFAULT_LANG } from "../config";

export function useTenantContext(): TenantOutletContext {
  const context = useOutletContext<TenantOutletContext | undefined>();
  
  // If context is not provided, use defaults
  // This should not happen in normal flow, but provides a safe fallback
  if (!context) {
    return {
      lang: DEFAULT_LANG,
      tenantSlug: DEFAULT_TENANT_SLUG,
    };
  }
  
  return context;
}

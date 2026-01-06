// src/app/tenant/useTenantContext.ts
import { useOutletContext } from "react-router-dom";
import type { TenantOutletContext } from "./TenantContext";

export function useTenantContext() {
  return useOutletContext<TenantOutletContext>();
}

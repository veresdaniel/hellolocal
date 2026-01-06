// src/app/tenant/useTenantContext.ts
import { useOutletContext } from "react-router-dom";
import type { Lang } from "../config";

type TenantCtx = { lang: Lang; tenantSlug: string };

export function useTenantContext() {
  return useOutletContext<TenantCtx>();
}

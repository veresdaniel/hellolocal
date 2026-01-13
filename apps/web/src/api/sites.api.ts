// src/api/sites.api.ts
import { apiPost } from "./client";

export interface ActivateFreeSiteResponse {
  siteId: string;
  slug: string;
  message: string;
}

export function activateFreeSite(lang: string): Promise<ActivateFreeSiteResponse> {
  return apiPost<ActivateFreeSiteResponse>(`/${lang}/sites/activate-free`, {});
}

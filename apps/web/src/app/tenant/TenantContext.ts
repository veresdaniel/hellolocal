import type { Lang } from "../config";

export type SiteOutletContext = {
  lang: Lang;
  siteSlug: string;
};

// Backward compatibility
export type TenantOutletContext = {
  lang: Lang;
  tenantSlug: string;
  siteSlug?: string;
};
// src/app/routing/buildPath.ts
import { HAS_MULTIPLE_TENANTS } from "../config";

/**
 * Builds a path with optional tenant slug based on multi-tenant configuration
 * Note: This function doesn't check tenant count - it's handled by TenantLayout
 * If you need to check tenant count, use the useActiveTenantsCount hook
 * 
 * The path format should be: /{lang}/{tenantSlug?}/{path}
 * TenantLayout will handle redirecting if tenant slug shouldn't be shown
 */
export function buildPath(opts: { tenantSlug: string; lang: string; path?: string }) {
  // The correct format is: /{lang}/{tenantSlug?}/{path}
  // If multi-tenant is enabled, include tenant slug (TenantLayout will redirect if needed)
  // If multi-tenant is disabled, don't include tenant slug
  const langPart = `/${opts.lang}`;
  const tenantPart = HAS_MULTIPLE_TENANTS ? `/${opts.tenantSlug}` : "";
  const rest = opts.path ? `/${opts.path.replace(/^\/+/, "")}` : "";
  return `${langPart}${tenantPart}${rest}`;
}

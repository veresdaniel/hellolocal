// src/app/routing/buildPath.ts
import { HAS_MULTIPLE_TENANTS } from "../config";

/**
 * Builds a path with optional tenant slug based on multi-tenant configuration
 * Note: This function doesn't check tenant count - it's handled by TenantLayout
 * If you need to check tenant count, use the useActiveTenantsCount hook
 */
export function buildPath(opts: { tenantSlug: string; lang: string; path?: string }) {
  // For now, we'll keep the tenant slug in the path if multi-tenant is enabled
  // The TenantLayout will handle redirecting if only one tenant exists
  // This is a simple approach - in the future, we could make this smarter
  const prefix = HAS_MULTIPLE_TENANTS ? `/${opts.tenantSlug}` : "";
  const rest = opts.path ? `/${opts.path.replace(/^\/+/, "")}` : "";
  return `${prefix}/${opts.lang}${rest}`;
}

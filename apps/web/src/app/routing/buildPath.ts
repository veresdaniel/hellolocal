// src/app/routing/buildPath.ts
import { HAS_MULTIPLE_TENANTS } from "../config";

export function buildPath(opts: { tenantSlug: string; lang: string; path?: string }) {
  const prefix = HAS_MULTIPLE_TENANTS ? `/${opts.tenantSlug}` : "";
  const rest = opts.path ? `/${opts.path.replace(/^\/+/, "")}` : "";
  return `${prefix}/${opts.lang}${rest}`;
}

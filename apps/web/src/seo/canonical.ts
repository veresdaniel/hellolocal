/**
 * Prefer a clean absolute canonical without query/hash noise.
 */
export function absoluteCanonical(pathname?: string): string {
  if (typeof window === "undefined") return pathname || "";
  const path = pathname ?? window.location.pathname;
  return `${window.location.origin}${path}`.replace(/\/$/, "") || window.location.origin;
}

/**
 * Prefer a clean absolute canonical: HTTPS origin + path without query/hash.
 * Trailing slash is stripped except for site root (`/`).
 */
export function normalizeCanonicalPath(pathname?: string): string {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Absolute canonical for the current (or given) path.
 * SSR/no-window: returns path only (caller supplies origin elsewhere).
 */
export function absoluteCanonical(pathname?: string): string {
  if (typeof window === "undefined") {
    const path = normalizeCanonicalPath(pathname);
    return path === "/" ? "/" : path;
  }
  const path = normalizeCanonicalPath(pathname);
  const origin = window.location.origin.replace(/\/$/, "");
  return path === "/" ? `${origin}/` : `${origin}${path}`;
}

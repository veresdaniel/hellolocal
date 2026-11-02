/** Client helpers for the public under-development gate cookie + query param. */

export const UC_QUERY_PARAM = "access";
export const UC_COOKIE_NAME = "hl_uc_access";
/** Persistent until token regen/invalidate (browsers may clamp ~400 days). */
export const UC_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export function readAccessQueryToken(search: string = window.location.search): string | null {
  try {
    const value = new URLSearchParams(search).get(UC_QUERY_PARAM);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort read of a non-HttpOnly cookie. Production preview cookies are HttpOnly
 * (set by the API/SSR), so this usually returns null there — the gate relies on
 * credentials: "include" instead.
 */
export function readAccessCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== UC_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim()) || null;
    } catch {
      return part.slice(idx + 1).trim() || null;
    }
  }
  return null;
}

/**
 * Legacy client-side cookie writer (HttpOnly cannot be set from JS).
 * Prefer the API/SSR Set-Cookie path. Kept for local/dev fallbacks only; always
 * marks Secure on HTTPS and never exposes a helper that skips SameSite.
 */
export function writeAccessCookie(token: string, maxAgeSec: number = UC_COOKIE_MAX_AGE_SEC): void {
  if (typeof document === "undefined" || !token) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // Not HttpOnly (impossible from document.cookie). Production uses server Set-Cookie.
  document.cookie = `${UC_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.max(
    0,
    Math.floor(maxAgeSec)
  )}; SameSite=Lax${secure}`;
}

/** Best-effort clear of a non-HttpOnly cookie; HttpOnly cookies are cleared via API Set-Cookie. */
export function clearAccessCookie(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${UC_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/**
 * Drop `?access=` from the URL without a navigation.
 * Prefer React Router `navigate(..., { replace: true })` from components when available;
 * this history helper remains for non-Router call sites.
 */
export function stripAccessQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(UC_QUERY_PARAM)) return;
  url.searchParams.delete(UC_QUERY_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function buildAccessPreviewUrl(origin: string, lang: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  const path = `/${lang || "hu"}`;
  return `${base}${path}?${UC_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

export function isAdminOrAuthPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "admin") return true;
  if (parts[1] === "admin") return true;
  return false;
}

/** Client helpers for the public under-development gate — constants from `@hellolocal/shared`. */

export {
  UC_COOKIE_MAX_AGE_SEC,
  UC_COOKIE_NAME,
  UC_QUERY_PARAM,
  UC_DEFAULT_COPY,
  UC_PUBLIC_API_PATH,
  buildAccessPreviewUrl,
  isAdminOrAuthPath,
  ucFailClosedCopy,
} from "@hellolocal/shared";

import {
  UC_COOKIE_MAX_AGE_SEC,
  UC_COOKIE_NAME,
  UC_QUERY_PARAM,
} from "@hellolocal/shared";

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
 * Prefer the API/SSR Set-Cookie path.
 */
export function writeAccessCookie(token: string, maxAgeSec: number = UC_COOKIE_MAX_AGE_SEC): void {
  if (typeof document === "undefined" || !token) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
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
 * Prefer React Router `navigate(..., { replace: true })` from components when available.
 */
export function stripAccessQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(UC_QUERY_PARAM)) return;
  url.searchParams.delete(UC_QUERY_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

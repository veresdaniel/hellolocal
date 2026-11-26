import { API_AUTH_GOOGLE } from "@hellolocal/shared";

/**
 * Prefer same-origin `/api/auth/google` so Google’s consent screen shows the
 * current public host (Caddy proxies these paths to the API). Fall back to
 * VITE_API_URL when the API origin is forced (e.g. local Vite without proxy).
 */
function googleAuthBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname;
    // Local Vite: API is on another port — keep absolute API URL.
    if (host === "localhost" || host === "127.0.0.1") {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) return String(apiUrl).replace(/\/$/, "").replace(/\/api$/, "");
      return "";
    }
    return window.location.origin;
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return "";
  return String(apiUrl).replace(/\/$/, "").replace(/\/api$/, "");
}

/** Google OAuth start URL — packs return host so custom domains round-trip after callback. */
export function googleAuthHref(lang: string, mode: "admin" | "visitor") {
  const params = new URLSearchParams({
    lang,
    mode,
    returnOrigin: typeof window !== "undefined" ? window.location.origin : "",
  });
  return `${googleAuthBase()}${API_AUTH_GOOGLE}?${params.toString()}`;
}

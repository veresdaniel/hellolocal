import { API_AUTH_GOOGLE } from "@hellolocal/shared";

/**
 * Same base as `api/client.ts` — production must hit `api.*`, not the SPA host.
 * Relative `/api/auth/google` on hellolocal.hu / custom domains is served as the SPA → 404.
 */
function apiOrigin(): string {
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
  return `${apiOrigin()}${API_AUTH_GOOGLE}?${params.toString()}`;
}

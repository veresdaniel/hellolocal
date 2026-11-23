import { API_AUTH_GOOGLE } from "@hellolocal/shared";

/** Google OAuth start URL — packs return host so custom domains round-trip after callback. */
export function googleAuthHref(lang: string, mode: "admin" | "visitor") {
  const params = new URLSearchParams({
    lang,
    mode,
    returnOrigin: typeof window !== "undefined" ? window.location.origin : "",
  });
  return `${API_AUTH_GOOGLE}?${params.toString()}`;
}

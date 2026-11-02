import {
  UC_COOKIE_MAX_AGE_SEC,
  UC_COOKIE_NAME,
} from "./under-construction.constants";

/**
 * Parent cookie Domain for sharing between the public host and api.* subdomain.
 * Prefer COOKIE_DOMAIN; else derive `.example.com` from FRONTEND_URL.
 * Omit on localhost / IPs (host-only cookies).
 */
export function resolveUcCookieDomain(): string | undefined {
  const configured = process.env.COOKIE_DOMAIN?.trim();
  if (configured) {
    return configured.startsWith(".") ? configured : `.${configured}`;
  }
  const frontend = process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  if (!frontend) return undefined;
  try {
    const host = new URL(frontend).hostname;
    if (!host || host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return undefined;
    }
    const parts = host.split(".");
    if (parts.length < 2) return undefined;
    return `.${parts.slice(-2).join(".")}`;
  } catch {
    return undefined;
  }
}

export function buildUcSetCookieHeader(
  token: string,
  maxAgeSec: number = UC_COOKIE_MAX_AGE_SEC,
  options?: { clear?: boolean }
): string {
  const maxAge = options?.clear ? 0 : Math.max(0, Math.floor(Number(maxAgeSec) || UC_COOKIE_MAX_AGE_SEC));
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    (process.env.FRONTEND_URL || "").startsWith("https:");
  const parts = [
    `${UC_COOKIE_NAME}=${options?.clear ? "" : encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  const domain = resolveUcCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

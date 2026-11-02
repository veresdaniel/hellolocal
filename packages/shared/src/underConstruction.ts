/** Shared under-development (beta) gate contract for API, web, and SSR. */

export const UC_ENABLED_KEY = "underConstruction.enabled";
export const UC_ACCESS_TOKEN_KEY = "underConstruction.accessToken";
export const UC_TOKEN_UPDATED_AT_KEY = "underConstruction.tokenUpdatedAt";
export const UC_COPY_KEY = "underConstruction.copy";

/** Query param for preview access links: `?access=<token>`. */
export const UC_QUERY_PARAM = "access";

/** Cookie set after a valid query token so later navigations stay open. */
export const UC_COOKIE_NAME = "hl_uc_access";

/**
 * Header for public API calls while previewing (api.* does not receive the
 * host-only cookie). Client copies the query token into sessionStorage.
 */
export const UC_ACCESS_HEADER = "x-uc-access";

/** sessionStorage key for the preview token (readable by SPA; cookie is HttpOnly). */
export const UC_ACCESS_SESSION_KEY = "hl_uc_access_token";

/**
 * Cookie Max-Age (seconds). Long-lived until token regen/invalidate.
 * Browsers may clamp (e.g. Chrome ~400 days); validity is still token-bound.
 */
export const UC_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

/** Public + admin REST paths (without `/api` prefix used by Nest `@Controller`). */
export const UC_PUBLIC_API_PATH = "/api/app-settings/under-construction";
export const UC_ADMIN_API_PATH = "/api/admin/under-construction";
/** Client helper paths relative to `/api` base used by `apiGet`/`apiPost`. */
export const UC_ADMIN_CLIENT_PATH = "/admin/under-construction";

export type UcLang = "hu" | "en" | "de";

export type UcCopyFields = {
  title: string;
  body: string;
  buttonLabel: string;
};

export type UcCopyByLang = Record<UcLang, UcCopyFields>;

export const UC_DEFAULT_COPY: UcCopyByLang = {
  hu: {
    title: "Fejlesztés alatt",
    body: "Az oldal jelenleg fejlesztés alatt áll. Hamarosan visszatérünk.",
    buttonLabel: "",
  },
  en: {
    title: "Under development",
    body: "This site is currently under development. Please check back soon.",
    buttonLabel: "",
  },
  de: {
    title: "In Entwicklung",
    body: "Diese Seite befindet sich derzeit in Entwicklung. Bitte schauen Sie bald wieder vorbei.",
    buttonLabel: "",
  },
};

/** Fail-closed copy used when the gate check cannot complete. */
export function ucFailClosedCopy(lang?: string): UcCopyFields {
  const key = lang === "en" || lang === "de" ? lang : "hu";
  const base = UC_DEFAULT_COPY[key];
  return { title: base.title, body: base.body, buttonLabel: base.buttonLabel };
}

export const UC_SECRET_KEYS = [UC_ACCESS_TOKEN_KEY] as const;

export type UcCookieEnv = {
  cookieDomain?: string;
  frontendUrl?: string;
  corsOrigin?: string;
  nodeEnv?: string;
  cookieSecure?: string;
};

/**
 * Cookie Domain for the UC preview cookie.
 *
 * Default: host-only (no Domain attribute). The public SPA talks to the gate via
 * same-origin `/api` on whichever host the visitor uses (platform or custom domain),
 * so a shared parent Domain is unnecessary — and a Domain derived from FRONTEND_URL
 * (e.g. `.hello-local.io`) is rejected by the browser on `helloetyek.hu`.
 *
 * Set COOKIE_DOMAIN only if you intentionally need a parent Domain.
 */
export function resolveUcCookieDomain(env: UcCookieEnv = {}): string | undefined {
  const configured = env.cookieDomain?.trim();
  if (!configured) return undefined;
  return configured.startsWith(".") ? configured : `.${configured}`;
}

export function buildUcSetCookieHeader(
  token: string,
  maxAgeSec: number = UC_COOKIE_MAX_AGE_SEC,
  options?: { clear?: boolean; env?: UcCookieEnv }
): string {
  const env = options?.env ?? {};
  const maxAge = options?.clear
    ? 0
    : Math.max(0, Math.floor(Number(maxAgeSec) || UC_COOKIE_MAX_AGE_SEC));
  const secure =
    env.nodeEnv === "production" ||
    env.cookieSecure === "true" ||
    (env.frontendUrl || "").startsWith("https:");
  const parts = [
    `${UC_COOKIE_NAME}=${options?.clear ? "" : encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  const domain = resolveUcCookieDomain(env);
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

/** Parse a Cookie header value for a named cookie. */
export function readCookieHeader(header: string | undefined | null, name: string): string | null {
  if (!header) return null;
  const parts = String(header).split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim()) || null;
    } catch {
      return part.slice(idx + 1).trim() || null;
    }
  }
  return null;
}

/**
 * Shareable beta/?access= preview URL.
 * Prefer a site slug path (`/hu/etyek-budai`) so the visitor lands on the region home,
 * not the platform region list (`/hu`).
 */
export function buildAccessPreviewUrl(
  origin: string,
  lang: string,
  token: string,
  siteSlug?: string | null
): string {
  const base = origin.replace(/\/$/, "");
  const langSeg = lang || "hu";
  const slug = typeof siteSlug === "string" ? siteSlug.trim().replace(/^\/+|\/+$/g, "") : "";
  const path = slug ? `/${langSeg}/${slug}` : `/${langSeg}`;
  return `${base}${path}?${UC_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * Admin console + auth pages (any depth): `/admin`, `/hu/admin`, `/hu/admin/sites/...`.
 * Used by the SPA gate so the whole admin tree stays outside the public UC lock.
 */
export function isAdminOrAuthPath(pathname: string): boolean {
  const parts = String(pathname || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  return parts.includes("admin");
}

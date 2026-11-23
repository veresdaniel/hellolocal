/**
 * Google OAuth return-origin state (custom domains must round-trip to the same host).
 */
import { frontendOrigin, hostnameFromUrl, isPlatformHostname } from "../seo/public-path.util";
import { langOrDefault, type Lang } from "../common/lang";

export type OAuthReturnMode = "admin" | "visitor";

export type OAuthReturnState = {
  origin: string;
  lang: Lang;
  mode: OAuthReturnMode;
};

function cleanHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

/** Encode return context for the Google OAuth `state` query param. */
export function encodeOAuthReturnState(state: OAuthReturnState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

/** Decode OAuth `state`; returns null when missing or malformed. */
export function decodeOAuthReturnState(raw: unknown): OAuthReturnState | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthReturnState>;
    if (!parsed || typeof parsed.origin !== "string") return null;
    const origin = new URL(parsed.origin).origin;
    const mode: OAuthReturnMode = parsed.mode === "visitor" ? "visitor" : "admin";
    return {
      origin,
      lang: langOrDefault(parsed.lang),
      mode,
    };
  } catch {
    return null;
  }
}

/** Fallback frontend origin from env (platform deploy). */
export function defaultOAuthFrontendOrigin(): string {
  return frontendOrigin();
}

/** Login path after Google callback (hash tokens appended by controller). */
export function oauthLoginPath(lang: Lang, mode: OAuthReturnMode): string {
  return mode === "visitor" ? `/${lang}/login` : `/${lang}/admin/login`;
}

/**
 * True when `origin` is the configured frontend or a known platform host name.
 * Custom domains are validated separately against SiteDomain / entity hosts.
 */
export function isConfiguredFrontendOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = cleanHost(url.hostname);
    if (isPlatformHostname(host) || isPlatformHostname(url.hostname.toLowerCase())) return true;
    const configured = cleanHost(hostnameFromUrl(process.env.FRONTEND_URL || ""));
    return Boolean(configured && (host === configured || `www.${host}` === configured));
  } catch {
    return false;
  }
}

export function normalizeReturnHost(origin: string): string | null {
  try {
    return cleanHost(new URL(origin).hostname);
  } catch {
    return null;
  }
}

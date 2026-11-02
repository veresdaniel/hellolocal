import {
  UC_COOKIE_MAX_AGE_SEC,
  UC_COOKIE_NAME,
  UC_PUBLIC_API_PATH,
  UC_QUERY_PARAM,
  ucFailClosedCopy,
} from "@hellolocal/shared";
import type { Lang } from "../types/enums";
// src/api/public.api.ts
/**
 * Public API functions that don't require authentication
 */

/**
 * Get API base URL from environment variable or use relative path for development.
 * In production, set VITE_API_URL at image build time (see deploy/docker-compose.yml).
 */
function getApiBaseUrl(): string {
  // In production, use environment variable if set
  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    // Remove trailing slash if present
    return apiUrl.replace(/\/$/, "");
  }

  // In development, use relative path (Vite proxy will handle it)
  // In production without VITE_API_URL, this will cause issues
  return "";
}

export interface DefaultLanguageResponse {
  defaultLanguage: Lang;
}

export interface ActiveSitesCountResponse {
  count: number;
}

// Backward compatibility
export type ActiveTenantsCountResponse = ActiveSitesCountResponse;

/**
 * Get default language from public endpoint (no authentication required)
 */
export async function getPublicDefaultLanguage(): Promise<DefaultLanguageResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/api/app-settings/default-language`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    // If API call fails, return default fallback
    return { defaultLanguage: "hu" };
  }

  return (await res.json()) as DefaultLanguageResponse;
}

/**
 * Get active sites count from public endpoint (no authentication required)
 */
export type PublicFormShieldPayload = {
  companyWebsite?: string;
  formStartedAt?: number;
  recaptchaToken?: string;
};

export type MunicipalQuotePayload = PublicFormShieldPayload & {
  organization: string;
  contactName: string;
  email: string;
  message: string;
  plan: "municipal";
};

export type MunicipalQuoteResult = {
  stored: boolean;
  emailed: boolean;
  reason: "sent" | "no_smtp" | "no_recipient" | "send_failed";
};

async function postQuoteRequest(
  body: Record<string, string | number | undefined>
): Promise<MunicipalQuoteResult> {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/api/public/quote-requests`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const message = Array.isArray(payload?.message) ? payload?.message[0] : payload?.message;
    throw new Error(message || "A kérést nem sikerült rögzíteni.");
  }
  return payload as MunicipalQuoteResult;
}

export async function requestMunicipalQuote(
  body: MunicipalQuotePayload
): Promise<MunicipalQuoteResult> {
  return postQuoteRequest(body);
}

export type DemoRequestPayload = PublicFormShieldPayload & {
  contactName: string;
  email: string;
  organization?: string;
  message?: string;
};

/** Demo request on the public landing. Same inbox as municipal quotes. */
export async function requestDemo(body: DemoRequestPayload): Promise<MunicipalQuoteResult> {
  return postQuoteRequest({
    contactName: body.contactName,
    email: body.email,
    organization: body.organization?.trim() ?? "",
    message: body.message?.trim() ?? "",
    plan: "demo",
    companyWebsite: body.companyWebsite,
    formStartedAt: body.formStartedAt,
    recaptchaToken: body.recaptchaToken,
  });
}

export async function getActiveSitesCount(): Promise<ActiveSitesCountResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/api/app-settings/active-sites-count`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    // If API call fails, assume single site (fallback)
    return { count: 1 };
  }

  return (await res.json()) as ActiveSitesCountResponse;
}

export type PlatformGaResponse = {
  gaMeasurementId: string | null;
};

/** Platform-wide GA4 ID for platform routes only (no site fallback). */
export type PlatformHostEntry = { host: string; lang: string };

export type PlatformHostResponse = {
  hosts: string[];
  entries: PlatformHostEntry[];
  host: string | null;
  origin: string | null;
};

/** Extra public platform hostnames. The first is the default origin. */
export async function getPublicPlatformHost(): Promise<PlatformHostResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/api/app-settings/platform-host`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { hosts: [], entries: [], host: null, origin: null };
  const data = (await res.json()) as Partial<PlatformHostResponse>;
  const hosts = Array.isArray(data.hosts)
    ? data.hosts.map((item) => String(item).trim()).filter(Boolean)
    : data.host?.trim()
      ? [data.host.trim()]
      : [];
  const entries = Array.isArray(data.entries)
    ? data.entries.flatMap((item) => {
        const host = String(item?.host ?? "").trim();
        const lang = String(item?.lang ?? "").trim();
        if (!host) return [];
        return [{ host, lang: lang === "en" || lang === "de" ? lang : "hu" }];
      })
    : [];
  return {
    hosts,
    entries,
    host: hosts[0] ?? null,
    origin: data.origin?.trim() || (hosts[0] ? `https://${hosts[0]}` : null),
  };
}

export async function getPublicPlatformGa(): Promise<PlatformGaResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/api/app-settings/platform-ga`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return { gaMeasurementId: null };
  }

  const data = (await res.json()) as PlatformGaResponse;
  return { gaMeasurementId: data.gaMeasurementId?.trim() || null };
}

export type UnderConstructionPublicStatus = {
  enabled: boolean;
  allowed: boolean;
  queryParam: string;
  cookieName: string;
  cookieMaxAgeSec: number;
  /** Server set/cleared HttpOnly cookie via Set-Cookie (token not in JSON). */
  refreshCookie?: boolean;
  clearCookie?: boolean;
  /** @deprecated Prefer refreshCookie; never trust client-readable tokens. */
  setCookieToken?: string | null;
  copy: { title: string; body: string; buttonLabel: string };
};

function ucFailClosedStatus(lang?: string): UnderConstructionPublicStatus {
  return {
    enabled: true,
    allowed: false,
    queryParam: UC_QUERY_PARAM,
    cookieName: UC_COOKIE_NAME,
    cookieMaxAgeSec: UC_COOKIE_MAX_AGE_SEC,
    refreshCookie: false,
    clearCookie: false,
    copy: ucFailClosedCopy(lang),
  };
}

/**
 * Public under-development gate.
 * Uses same-origin `/api` (Vite/web proxy) so the HttpOnly preview cookie is host-scoped
 * on the public site and reaches the gate on every navigation — not api.* alone.
 */
export async function getUnderConstructionGate(options?: {
  lang?: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<UnderConstructionPublicStatus> {
  const params = new URLSearchParams();
  if (options?.lang) params.set("lang", options.lang);
  if (options?.accessToken) params.set(UC_QUERY_PARAM, options.accessToken);
  const query = params.toString();
  try {
    const res = await fetch(`${UC_PUBLIC_API_PATH}${query ? `?${query}` : ""}`, {
      headers: { Accept: "application/json" },
      credentials: "include",
      signal: options?.signal,
    });
    if (res.status === 429) {
      return { ...ucFailClosedStatus(options?.lang), enabled: false, allowed: true };
    }
    if (!res.ok) {
      return ucFailClosedStatus(options?.lang);
    }
    return (await res.json()) as UnderConstructionPublicStatus;
  } catch {
    return ucFailClosedStatus(options?.lang);
  }
}

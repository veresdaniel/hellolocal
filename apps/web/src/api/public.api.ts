import type { Lang} from "../types/enums";
// src/api/public.api.ts
/**
 * Public API functions that don't require authentication
 */

/**
 * Get API base URL from environment variable or use relative path for development
 * IMPORTANT: On Render.com, this must be set as an environment variable
 * in the frontend service settings BEFORE building.
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
export type MunicipalQuotePayload = {
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

export async function requestMunicipalQuote(
  body: MunicipalQuotePayload
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

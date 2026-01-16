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
  defaultLanguage: "hu" | "en" | "de";
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


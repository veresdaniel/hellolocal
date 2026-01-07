// src/api/public.api.ts
/**
 * Public API functions that don't require authentication
 */

/**
 * Get API base URL from environment variable or use relative path for development
 */
function getApiBaseUrl(): string {
  // In production, use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use relative path (Vite proxy will handle it)
  return "";
}

export interface DefaultLanguageResponse {
  defaultLanguage: "hu" | "en" | "de";
}

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


// src/api/public.api.ts
/**
 * Public API functions that don't require authentication
 */

export interface DefaultLanguageResponse {
  defaultLanguage: "hu" | "en" | "de";
}

/**
 * Get default language from public endpoint (no authentication required)
 */
export async function getPublicDefaultLanguage(): Promise<DefaultLanguageResponse> {
  const res = await fetch("/api/app-settings/default-language", {
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


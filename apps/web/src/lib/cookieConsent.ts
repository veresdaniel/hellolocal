export const COOKIE_CONSENT_KEY = "hellolocal_cookie_consent";
export const COOKIE_CONSENT_EVENT = "hellolocal:cookie-consent";
/** Open / re-open the consent banner (e.g. footer / menu “Cookie settings”). */
export const COOKIE_CONSENT_OPEN_EVENT = "hellolocal:cookie-consent-open";

export type CookieConsentStatus = "accepted" | "dismissed" | null;

export function getCookieConsentStatus(): CookieConsentStatus {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted") return "accepted";
    if (value === "dismissed") return "dismissed";
    return null;
  } catch {
    return null;
  }
}

export function hasCookieConsent(): boolean {
  return getCookieConsentStatus() === "accepted";
}

export function acceptCookieConsent(): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  }
}

/** Hide the banner without enabling analytics — user can accept later. */
export function dismissCookieConsent(): void {
  try {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) !== "accepted") {
      localStorage.setItem(COOKIE_CONSENT_KEY, "dismissed");
    }
  } catch {
    /* ignore */
  }
}

/** Re-open the consent UI from footer / menu. */
export function openCookieConsentSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
  }
}

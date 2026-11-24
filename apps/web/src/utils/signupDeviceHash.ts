/**
 * Soft device signal for signup abuse scoring (hashed server-side).
 * Persists a random id in localStorage — not a fingerprint of hardware; VPN/private mode resets it.
 */

const STORAGE_KEY = "hl_signup_device";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

/** Returns a stable-per-browser id (8–128 chars) or undefined if storage is unavailable. */
export function getSignupDeviceHash(): string | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    let value = localStorage.getItem(STORAGE_KEY)?.trim() || "";
    if (!value || value.length < 8) {
      value = randomId();
      localStorage.setItem(STORAGE_KEY, value);
    }
    return value.slice(0, 128);
  } catch {
    return undefined;
  }
}

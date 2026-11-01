/**
 * Validates a post-login return path to prevent open redirects.
 * Only same-origin relative paths starting with a single "/" are accepted.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  // Reject scheme-relative tricks and embedded schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return fallback;
  }
  if (typeof window === "undefined") {
    return value;
  }
  try {
    const resolved = new URL(value, window.location.origin);
    if (resolved.origin !== window.location.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

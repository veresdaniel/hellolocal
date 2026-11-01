/** AppSetting key for the platform-wide GA4 measurement ID (superadmin). */
export const PLATFORM_GA_MEASUREMENT_ID_KEY = "platformGaMeasurementId";

/** GA4 measurement IDs look like G-XXXXXXXX (uppercase alphanumerics after G-). */
export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

/**
 * Empty / whitespace → null (disabled). Non-empty must match GA4 form.
 * Returns the normalized uppercase ID or null.
 */
export function normalizeGaMeasurementId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!GA_MEASUREMENT_ID_PATTERN.test(upper)) {
    throw new Error("INVALID_GA_MEASUREMENT_ID");
  }
  return upper;
}

export function isValidGaMeasurementIdInput(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  return GA_MEASUREMENT_ID_PATTERN.test(trimmed.toUpperCase());
}

/**
 * Most-specific wins. Pass candidates from specific → general
 * (e.g. Event, Place, Town, Site). Invalid / empty values are skipped.
 * Does not fall back to platform GA (site routes stay isolated from platform).
 */
export function resolveGaMeasurementId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const raw of candidates) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    try {
      const normalized = normalizeGaMeasurementId(trimmed);
      if (normalized) return normalized;
    } catch {
      /* skip invalid */
    }
  }
  return null;
}

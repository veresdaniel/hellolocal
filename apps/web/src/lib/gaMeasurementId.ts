/** GA4 measurement IDs look like G-XXXXXXXX (uppercase alphanumerics after G-). */
export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

/** Empty is allowed (disables analytics). Non-empty must match G-… form. */
export function isValidGaMeasurementIdInput(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  return GA_MEASUREMENT_ID_PATTERN.test(trimmed.toUpperCase());
}

/** Empty → null. Invalid → throws. Valid → uppercase ID. */
export function normalizeGaMeasurementId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!GA_MEASUREMENT_ID_PATTERN.test(upper)) {
    throw new Error("INVALID_GA_MEASUREMENT_ID");
  }
  return upper;
}

/** GTM container IDs look like GTM-XXXXXXX (uppercase alphanumerics after GTM-). */
export const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/** Empty is allowed (disables GTM). Non-empty must match GTM-… form. */
export function isValidGtmContainerIdInput(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  return GTM_CONTAINER_ID_PATTERN.test(trimmed.toUpperCase());
}

/** Empty → null. Invalid → throws. Valid → uppercase ID. */
export function normalizeGtmContainerId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!GTM_CONTAINER_ID_PATTERN.test(upper)) {
    throw new Error("INVALID_GTM_CONTAINER_ID");
  }
  return upper;
}

/** AppSetting key for the platform-wide GTM container ID (superadmin). */
export const PLATFORM_GTM_CONTAINER_ID_KEY = "platformGtmContainerId";

/** GTM container IDs look like GTM-XXXXXXX (uppercase alphanumerics after GTM-). */
export const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/**
 * Empty / whitespace → null (disabled). Non-empty must match GTM form.
 * Returns the normalized uppercase ID or null.
 */
export function normalizeGtmContainerId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!GTM_CONTAINER_ID_PATTERN.test(upper)) {
    throw new Error("INVALID_GTM_CONTAINER_ID");
  }
  return upper;
}

export function isValidGtmContainerIdInput(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  return GTM_CONTAINER_ID_PATTERN.test(trimmed.toUpperCase());
}

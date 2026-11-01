/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/** First non-empty slug. Later values are language fallbacks, then a last resort such as the id. */
export function fallbackSlug(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return null;
}

/** Keep an existing slug. Only fill ids that are still missing. */
export function assignMissingSlugs(
  target: Map<string, string>,
  rows: readonly { entityId: string; slug: string | null | undefined }[]
) {
  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug || target.has(row.entityId)) continue;
    target.set(row.entityId, slug);
  }
}

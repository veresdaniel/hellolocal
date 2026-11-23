/**
 * Resolve public SEO title / description / image for CSR page builders.
 * Admin seo* overrides win when non-empty; otherwise cascade from content
 * (name / shortDescription / first sentences of description / heroImage).
 * Mirrors SSR `siteShare` / `entityShare` in socialMeta.js.
 */

/** Strip tags and collapse whitespace for SEO description fallbacks. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** First N sentences of plain text (or a 280-char clip when no sentence breaks). */
export function firstSentences(html: string | null | undefined, count = 2): string {
  const text = stripHtml(html);
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (!sentences.length) return text.slice(0, 280).trim();
  return sentences.slice(0, count).join(" ").trim();
}

function pick(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const clean = typeof value === "string" ? value.trim() : "";
    if (clean) return clean;
  }
  return "";
}

export type SeoFieldSource = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImage?: string | null;
  name?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  heroImage?: string | null;
  image?: string | null;
};

/**
 * Empty admin seo* → content cascade (name / shortDescription / heroImage / …).
 */
export function resolveSeoFields(
  source: SeoFieldSource,
  fallback?: { title?: string; description?: string; image?: string }
): { title: string; description: string; image?: string } {
  const title = pick(source.seoTitle, source.name, source.title, fallback?.title);
  const description = pick(
    source.seoDescription ? stripHtml(source.seoDescription) : "",
    source.shortDescription ? stripHtml(source.shortDescription) : "",
    firstSentences(source.description, 2),
    fallback?.description
  );
  const image =
    pick(source.seoImage, source.heroImage, source.image, fallback?.image) || undefined;
  return { title, description, image };
}

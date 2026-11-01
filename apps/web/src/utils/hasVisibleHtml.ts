export function hasVisibleHtml(html?: string | null) {
  if (!html) return false;
  if (/<(img|iframe|video|svg|picture|audio)\b/i.test(html)) return true;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

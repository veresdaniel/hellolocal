/** Where the overview “see it live” button opens. A path stays in the app; http(s) leaves it. */
export function resolveLiveDemoHref(
  raw: string | null | undefined,
  fallback: string
): { href: string; external: boolean } {
  const value = (raw ?? "").trim();
  if (!value) return { href: fallback, external: false };
  if (value.startsWith("/") && !value.startsWith("//") && !/\s/.test(value)) {
    return { href: value, external: false };
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return { href: url.toString(), external: true };
      }
    } catch {
      /* fall through */
    }
  }
  return { href: fallback, external: false };
}

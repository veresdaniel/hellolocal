import { platformGuidePath } from "./guidePaths";

/** Canonical host for a platform guide. Hungarian on .hu, English and German on .eu. */
export function guideCanonical(origin: string, lang: string, slug: string): string {
  let host = "";
  try {
    host = new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  const marketing = host === "hellolocal.hu" || host === "hellolocal.eu" || host === "hello-local.io";
  const base = !marketing
    ? origin.replace(/\/$/, "")
    : lang === "hu"
      ? "https://hellolocal.hu"
      : "https://hellolocal.eu";
  return `${base}${platformGuidePath(lang, slug)}`;
}

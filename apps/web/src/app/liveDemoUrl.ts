import { isLang, type Lang } from "./config";
import { isMapViewSegment, isRegionListPathSegment, mapViewSegment } from "./entityPaths";

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

/**
 * Map view of a live-demo address.
 * `https://helloetyek.hu/hu` → `https://helloetyek.hu/hu/terkep`.
 * The language in the path picks terkep / map / karte.
 */
export function liveDemoMapHref(href: string, fallbackLang: Lang): string {
  let url: URL;
  try {
    url = new URL(href, "https://local.invalid");
  } catch {
    return href;
  }
  const external = url.origin !== "https://local.invalid";
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  // Already the map, or the region index (no single map to append).
  if (last && (isMapViewSegment(last) || isRegionListPathSegment(last))) return href;
  const lang = parts[0] && isLang(parts[0]) ? parts[0] : fallbackLang;
  url.pathname = `/${[...parts, mapViewSegment(lang)].join("/")}`;
  if (!external) return `${url.pathname}${url.search}${url.hash}`;
  return url.toString();
}

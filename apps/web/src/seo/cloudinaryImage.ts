/**
 * Prefer modern, sized delivery for public images.
 * - Cloudinary `/upload/` → inject f_auto,q_auto (+ optional w_)
 * - Wikimedia upload/thumb → thumb.wikimedia.org at an allowed width
 * - Placeholder hosts (picsum, etc.) → same-origin marketing fallback
 *
 * Note: Cloudinary `/image/fetch/` is not used — this account restricts fetch.
 */

const CLOUDINARY_HOST = /res\.cloudinary\.com/i;

const UNUSABLE_IMAGE_HOSTS = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "loremflickr.com",
  "placekitten.com",
  "via.placeholder.com",
  "placehold.co",
  "placehold.it",
]);

const FALLBACK_PUBLIC_IMAGE = "/marketing/map-szeged-720.webp";

/** Wikimedia only serves a fixed width ladder (see https://w.wiki/GHai). */
const WIKI_THUMB_WIDTHS = [500, 960, 1280, 1920] as const;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isUnusableHost(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (UNUSABLE_IMAGE_HOSTS.has(host)) return true;
  for (const blocked of UNUSABLE_IMAGE_HOSTS) {
    if (host.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

function snapWikiWidth(width: number): number {
  const w = Math.max(1, Math.round(width));
  for (const allowed of WIKI_THUMB_WIDTHS) {
    if (w <= allowed) return allowed;
  }
  return WIKI_THUMB_WIDTHS[WIKI_THUMB_WIDTHS.length - 1];
}

/**
 * Resize Wikimedia commons images via thumb.wikimedia.org (no Cloudinary fetch).
 * Returns null when the URL is not a commons bitmap we can rewrite.
 */
export function wikimediaThumbUrl(
  url: string,
  width: number
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host !== "upload.wikimedia.org" &&
    host !== "thumb.wikimedia.org"
  ) {
    return null;
  }

  // /wikipedia/commons/a/ab/File.jpg
  // /wikipedia/commons/thumb/a/ab/File.jpg/960px-File.jpg
  const path = parsed.pathname;
  const thumbHit = path.match(
    /^(\/wikipedia\/(?:commons|en)\/)thumb\/([0-9a-f]\/[0-9a-f]{2}\/)([^/]+\.(jpe?g|png|gif|webp|tiff?))\/\d+px-\3$/i
  );
  const fullHit = path.match(
    /^(\/wikipedia\/(?:commons|en)\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/]+\.(jpe?g|png|gif|webp|tiff?))$/i
  );
  const hit = thumbHit || fullHit;
  if (!hit) return null;

  const root = hit[1];
  const hash = hit[2];
  const filename = hit[3];
  const w = snapWikiWidth(width);
  return `https://thumb.wikimedia.org${root}thumb/${hash}${filename}/${w}px-${filename}`;
}

/**
 * @param url Original image URL (any host) or same-origin path
 * @param opts.width Max display width for delivery (CSS px × ~2 DPR)
 */
export function preferModernImageUrl(
  url: string | null | undefined,
  opts?: { width?: number }
): string {
  const raw = String(url || "").trim();
  if (!raw) return raw;

  // Same-origin paths stay as-is (already optimized marketing ladder, etc.)
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  if (isUnusableHost(raw)) return FALLBACK_PUBLIC_IMAGE;

  const w = opts?.width && opts.width > 0 ? Math.round(opts.width) : 960;
  const widthBit = `w_${w},`;

  if (CLOUDINARY_HOST.test(raw)) {
    if (/\/upload\/(?:[^/]+,)*f_auto/.test(raw)) return raw;
    const auto = `${widthBit}f_auto,q_auto`;
    if (/\/upload\/[^/]+,/.test(raw)) {
      return raw.replace(/\/upload\//, `/upload/${auto},`);
    }
    return raw.replace(/\/upload\/(?:v\d+\/)?/, `/upload/${auto}/`);
  }

  const wiki = wikimediaThumbUrl(raw, w);
  if (wiki) return wiki;

  return raw;
}

/**
 * Prefer modern, sized delivery for public images.
 * - Cloudinary `/upload/` → inject f_auto,q_auto (+ optional w_)
 * - Other https URLs → Cloudinary `/image/fetch/` when cloud name is configured
 * - Placeholder hosts (picsum, etc.) → same-origin marketing fallback
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

function cloudName(): string {
  try {
    return String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  } catch {
    return "";
  }
}

/**
 * @param url Original image URL (any host) or same-origin path
 * @param opts.width Max display width for Cloudinary `w_` (CSS px × ~2 DPR)
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

  // Remote (e.g. Wikimedia): resize + WebP via Cloudinary fetch when configured
  const cloud = cloudName();
  if (cloud && /^https?:\/\//i.test(raw)) {
    return `https://res.cloudinary.com/${cloud}/image/fetch/${widthBit}f_auto,q_auto/${encodeURIComponent(raw)}`;
  }

  return raw;
}

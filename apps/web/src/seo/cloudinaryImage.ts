/**
 * Prefer modern delivery for Cloudinary URLs (f_auto,q_auto) without changing uploads.
 * Non-Cloudinary URLs are returned unchanged.
 */

const CLOUDINARY_HOST = /res\.cloudinary\.com/i;

/**
 * Inject `f_auto,q_auto` (and optional `w_`) into a Cloudinary `/upload/` URL for SSR/CSR images.
 */
/**
 * @param url Original image URL (any host)
 * @param opts.width Optional `w_` transform when inserting Cloudinary auto formats
 * @returns Rewritten Cloudinary URL, or the original string unchanged
 */
export function preferModernImageUrl(
  url: string | null | undefined,
  opts?: { width?: number }
): string {
  const raw = String(url || "").trim();
  if (!raw || !CLOUDINARY_HOST.test(raw)) return raw;
  if (/\/upload\/(?:[^/]+,)*f_auto/.test(raw)) return raw;

  const widthBit = opts?.width && opts.width > 0 ? `w_${Math.round(opts.width)},` : "";
  const auto = `${widthBit}f_auto,q_auto`;
  // Existing transform segment (contains a comma) → prepend auto formats.
  if (/\/upload\/[^/]+,/.test(raw)) {
    return raw.replace(/\/upload\//, `/upload/${auto},`);
  }
  return raw.replace(/\/upload\/(?:v\d+\/)?/, `/upload/${auto}/`);
}

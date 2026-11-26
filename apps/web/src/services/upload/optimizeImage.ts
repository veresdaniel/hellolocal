/**
 * Client-side image optimize before CDN upload.
 * Resizes long edge and prefers WebP (JPEG fallback) to cut upload + storage cost.
 */

export type OptimizeImageOptions = {
  /** Longest edge in px. Default 1920 — enough for retina heroes, small uploads. */
  maxEdge?: number;
  /** Encoder quality 0–1. Default 0.82. */
  quality?: number;
};

const DEFAULT_MAX_EDGE = 1920;
const DEFAULT_QUALITY = 0.82;
/** Skip re-encode when already small enough and within max edge. */
const SKIP_BYTES = 350_000;

let webpSupported: boolean | null = null;

function supportsWebp(): boolean {
  if (webpSupported != null) return webpSupported;
  try {
    webpSupported = document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Resize + re-encode to WebP (or JPEG). Leaves GIF/SVG untouched.
 * Returns the original file when optimization would not help or fails.
 */
export async function optimizeImage(
  file: File,
  options?: OptimizeImageOptions
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const alreadyWebp = file.type === "image/webp";
    if (scale >= 1 && file.size <= SKIP_BYTES && alreadyWebp) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const preferWebp = supportsWebp();
    const mime = preferWebp ? "image/webp" : "image/jpeg";
    const ext = preferWebp ? "webp" : "jpg";

    let blob = await toBlob(canvas, mime, quality);
    if (!blob && preferWebp) {
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) return file;

    // Keep original if re-encode grew the file and we did not shrink pixels.
    if (blob.size >= file.size && scale >= 1) {
      return file;
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const outType = blob.type || mime;
    const outExt = outType === "image/webp" ? "webp" : outType === "image/jpeg" ? "jpg" : ext;
    return new File([blob], `${base}.${outExt}`, {
      type: outType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

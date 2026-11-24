/**
 * Keep in sync with `src/marketing/overviewImages.ts` (SSR cannot import TS).
 */

export const OVERVIEW_LCP_PRELOAD = "/marketing/map-szeged-720.webp";

export const OVERVIEW_HERO_MAP = {
  jpg: "/marketing/map-szeged.jpg",
  webp: "/marketing/map-szeged-960.webp",
  width: 960,
  height: 615,
  webpSrcSet:
    "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w, /marketing/map-szeged-960.webp 960w",
  sizes: "(max-width: 860px) 100vw, 36vw",
};

const STORY_SIZES = "(max-width: 860px) 92vw, 42vw";

export const OVERVIEW_STORY_IMAGES = {
  maker: {
    jpg: "/marketing/craft-workshop.jpg",
    webp: "/marketing/craft-workshop-960.webp",
    width: 960,
    height: 720,
    webpSrcSet:
      "/marketing/craft-workshop-480.webp 480w, /marketing/craft-workshop-720.webp 720w, /marketing/craft-workshop-960.webp 960w, /marketing/craft-workshop-1100.webp 1100w",
    sizes: STORY_SIZES,
  },
  service: {
    jpg: "/marketing/local-service.jpg",
    webp: "/marketing/local-service-960.webp",
    width: 960,
    height: 720,
    webpSrcSet:
      "/marketing/local-service-480.webp 480w, /marketing/local-service-720.webp 720w, /marketing/local-service-960.webp 960w, /marketing/local-service-1100.webp 1100w",
    sizes: STORY_SIZES,
  },
  quiet: {
    jpg: "/marketing/side-street.jpg",
    webp: "/marketing/side-street-960.webp",
    width: 720,
    height: 960,
    webpSrcSet:
      "/marketing/side-street-480.webp 480w, /marketing/side-street-720.webp 720w, /marketing/side-street-960.webp 960w, /marketing/side-street-1100.webp 1100w",
    sizes: STORY_SIZES,
  },
  town: {
    jpg: "/marketing/map-szeged.jpg",
    webp: "/marketing/map-szeged-1100.webp",
    width: 1100,
    height: 704,
    webpSrcSet: "/marketing/map-szeged-1100.webp 1100w",
    sizes: STORY_SIZES,
  },
};

/**
 * @param {{ jpg: string, webp: string, width: number, height: number, webpSrcSet: string, sizes: string }} img
 * @param {string} alt
 * @param {{ eager?: boolean, className?: string }} [opts]
 */
export function pictureHtml(img, alt, opts = {}) {
  const loading = opts.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const cls = opts.className ? ` class="${opts.className}"` : "";
  return `<picture><source type="image/webp" srcset="${img.webpSrcSet}" sizes="${img.sizes}" /><img${cls} src="${img.jpg}" alt="${alt}" width="${img.width}" height="${img.height}" ${loading} decoding="async" /></picture>`;
}

/**
 * Keep in sync with `src/marketing/overviewImages.ts` (SSR cannot import TS).
 */

export const OVERVIEW_LCP_PRELOAD = "/marketing/map-szeged-720.webp";
export const OVERVIEW_LCP_PRELOAD_SRCSET =
  "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w";
export const OVERVIEW_LCP_PRELOAD_SIZES = "(max-width: 860px) 100vw, 36vw";

export const OVERVIEW_HERO_MAP = {
  jpg: "/marketing/map-szeged.jpg",
  webp: "/marketing/map-szeged-720.webp",
  width: 960,
  height: 615,
  webpSrcSet:
    "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w, /marketing/map-szeged-960.webp 960w",
  webpSrcSetMobile:
    "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w",
  mobileMedia: "(max-width: 860px)",
  sizes: "(max-width: 860px) 100vw, 36vw",
};

const STORY_SIZES = "(max-width: 860px) 92vw, 42vw";
const MOBILE_MEDIA = "(max-width: 860px)";

export const OVERVIEW_STORY_IMAGES = {
  maker: {
    jpg: "/marketing/craft-workshop.jpg",
    webp: "/marketing/craft-workshop-960.webp",
    width: 960,
    height: 720,
    webpSrcSet:
      "/marketing/craft-workshop-480.webp 480w, /marketing/craft-workshop-720.webp 720w, /marketing/craft-workshop-960.webp 960w, /marketing/craft-workshop-1100.webp 1100w",
    webpSrcSetMobile:
      "/marketing/craft-workshop-480.webp 480w, /marketing/craft-workshop-720.webp 720w",
    mobileMedia: MOBILE_MEDIA,
    sizes: STORY_SIZES,
  },
  service: {
    jpg: "/marketing/local-service.jpg",
    webp: "/marketing/local-service-960.webp",
    width: 960,
    height: 720,
    webpSrcSet:
      "/marketing/local-service-480.webp 480w, /marketing/local-service-720.webp 720w, /marketing/local-service-960.webp 960w, /marketing/local-service-1100.webp 1100w",
    webpSrcSetMobile:
      "/marketing/local-service-480.webp 480w, /marketing/local-service-720.webp 720w",
    mobileMedia: MOBILE_MEDIA,
    sizes: STORY_SIZES,
  },
  quiet: {
    jpg: "/marketing/side-street.jpg",
    webp: "/marketing/side-street-720.webp",
    width: 720,
    height: 960,
    webpSrcSet:
      "/marketing/side-street-480.webp 480w, /marketing/side-street-720.webp 720w, /marketing/side-street-960.webp 960w, /marketing/side-street-1100.webp 1100w",
    webpSrcSetMobile:
      "/marketing/side-street-480.webp 480w, /marketing/side-street-720.webp 720w",
    mobileMedia: MOBILE_MEDIA,
    sizes: STORY_SIZES,
  },
  town: {
    jpg: "/marketing/map-szeged.jpg",
    webp: "/marketing/map-szeged-720.webp",
    width: 960,
    height: 615,
    webpSrcSet:
      "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w, /marketing/map-szeged-960.webp 960w, /marketing/map-szeged-1100.webp 1100w",
    webpSrcSetMobile:
      "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w",
    mobileMedia: MOBILE_MEDIA,
    sizes: STORY_SIZES,
  },
};

/**
 * @param {{ jpg: string, webp: string, width: number, height: number, webpSrcSet: string, webpSrcSetMobile?: string, mobileMedia?: string, sizes: string }} img
 * @param {string} alt
 * @param {{ eager?: boolean, className?: string }} [opts]
 */
export function pictureHtml(img, alt, opts = {}) {
  const loading = opts.eager
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy" fetchpriority="low"';
  const cls = opts.className ? ` class="${opts.className}"` : "";
  const mobile =
    img.webpSrcSetMobile && img.mobileMedia
      ? `<source type="image/webp" media="${img.mobileMedia}" srcset="${img.webpSrcSetMobile}" sizes="${img.sizes}" />`
      : "";
  // Prefer WebP as the <img src> so LCP never falls back to the heavy JPG master.
  const imgSrc = img.webp || img.jpg;
  return `<picture>${mobile}<source type="image/webp" srcset="${img.webpSrcSet}" sizes="${img.sizes}" /><img${cls} src="${imgSrc}" alt="${alt}" width="${img.width}" height="${img.height}" ${loading} decoding="async" /></picture>`;
}

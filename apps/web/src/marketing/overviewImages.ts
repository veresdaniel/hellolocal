/**
 * Overview marketing images: static responsive WebP ladder + JPG fallback.
 * Widths match display (hero ~half of 1120px; stories full column; 2x DPR).
 * Not a runtime image CDN — regenerate with cwebp when masters change.
 */

export type MarketingImage = {
  /** Default JPG fallback (≈960w). */
  jpg: string;
  /** Default WebP (≈960w) for older picture consumers. */
  webp: string;
  /** Intrinsic width/height of the default fallback. */
  width: number;
  height: number;
  /** WebP srcset: "url w, …" */
  webpSrcSet: string;
  /** JPG srcset for browsers without WebP in <source>. */
  jpgSrcSet: string;
  /** sizes hint for the placement. */
  sizes: string;
};

function ladder(base: string, widths: number[], aspect: { w: number; h: number }, sizes: string): MarketingImage {
  const defaultW = widths.includes(960) ? 960 : widths[widths.length - 1];
  const webpSrcSet = widths.map((w) => `/marketing/${base}-${w}.webp ${w}w`).join(", ");
  const jpgSrcSet = `${`/marketing/${base}.jpg`} ${defaultW}w`;
  return {
    jpg: `/marketing/${base}.jpg`,
    webp: `/marketing/${base}-${defaultW}.webp`,
    width: aspect.w,
    height: aspect.h,
    webpSrcSet,
    jpgSrcSet,
    sizes,
  };
}

/** Hero LCP map mock — displayed ~390–530 CSS px wide. */
export const OVERVIEW_HERO_MAP = ladder(
  "map-szeged",
  [480, 720, 960],
  { w: 960, h: 615 },
  "(max-width: 860px) 100vw, 36vw"
);

/** Story frames — one column, up to ~560 CSS px. */
const STORY_SIZES = "(max-width: 860px) 92vw, 42vw";

export const OVERVIEW_STORY_IMAGES = {
  maker: ladder("craft-workshop", [480, 720, 960, 1100], { w: 960, h: 720 }, STORY_SIZES),
  service: ladder("local-service", [480, 720, 960, 1100], { w: 960, h: 720 }, STORY_SIZES),
  quiet: ladder("side-street", [480, 720, 960, 1100], { w: 720, h: 960 }, STORY_SIZES),
  /** Below-fold only — avoid sharing LCP hero URLs (lazy + same src confuses Lighthouse). */
  town: ladder("map-szeged", [1100], { w: 1100, h: 704 }, STORY_SIZES),
} as const;

export const OVERVIEW_CLOSING = ladder(
  "visitor-hiker",
  [480, 720, 960, 1100],
  { w: 960, h: 637 },
  "(max-width: 860px) 92vw, 40vw"
);

/** Preferred LCP preload candidate (covers mobile 2x and desktop 1x). */
export const OVERVIEW_LCP_PRELOAD = "/marketing/map-szeged-720.webp";

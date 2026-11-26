/**
 * Overview marketing images: static responsive WebP ladder + JPG fallback.
 * Widths match display (hero ~half of 1120px; stories full column; 2x DPR).
 * Not a runtime image CDN — regenerate with cwebp when masters change.
 */

export type MarketingImage = {
  /** Default JPG fallback (≈960w). */
  jpg: string;
  /** Default WebP candidate (prefer mid ladder for LCP). */
  webp: string;
  /** Intrinsic width/height of the default fallback. */
  width: number;
  height: number;
  /** WebP srcset: "url w, …" (desktop / default). */
  webpSrcSet: string;
  /**
   * Optional mobile-capped WebP srcset (omit large desktop widths).
   * Used with `mobileMedia` so Lighthouse mobile does not pull 960w+.
   */
  webpSrcSetMobile?: string;
  /** Media query for `webpSrcSetMobile` (default max-width: 860px). */
  mobileMedia?: string;
  /** JPG srcset for browsers without WebP in <source>. */
  jpgSrcSet: string;
  /** sizes hint for the placement. */
  sizes: string;
};

function ladder(
  base: string,
  widths: number[],
  aspect: { w: number; h: number },
  sizes: string,
  opts?: { defaultWebpW?: number; mobileWidths?: number[] }
): MarketingImage {
  const defaultW =
    opts?.defaultWebpW && widths.includes(opts.defaultWebpW)
      ? opts.defaultWebpW
      : widths.includes(960)
        ? 960
        : widths[widths.length - 1];
  const webpSrcSet = widths.map((w) => `/marketing/${base}-${w}.webp ${w}w`).join(", ");
  const jpgSrcSet = `${`/marketing/${base}.jpg`} ${defaultW}w`;
  const mobileWidths = opts?.mobileWidths?.filter((w) => widths.includes(w));
  return {
    jpg: `/marketing/${base}.jpg`,
    webp: `/marketing/${base}-${defaultW}.webp`,
    width: aspect.w,
    height: aspect.h,
    webpSrcSet,
    webpSrcSetMobile: mobileWidths?.length
      ? mobileWidths.map((w) => `/marketing/${base}-${w}.webp ${w}w`).join(", ")
      : undefined,
    mobileMedia: mobileWidths?.length ? "(max-width: 860px)" : undefined,
    jpgSrcSet,
    sizes,
  };
}

/**
 * Hero LCP map mock — mobile column ≈ full wrap width but height-capped (~220px).
 * Cap mobile srcset at 720w so Slow-4G / high-DPR Lighthouse does not fetch 960.
 */
export const OVERVIEW_HERO_MAP = ladder(
  "map-szeged",
  [480, 720, 960],
  { w: 960, h: 615 },
  "(max-width: 860px) 100vw, 36vw",
  { defaultWebpW: 720, mobileWidths: [480, 720] }
);

/** Story frames — one column, up to ~560 CSS px. */
const STORY_SIZES = "(max-width: 860px) 92vw, 42vw";

export const OVERVIEW_STORY_IMAGES = {
  maker: ladder("craft-workshop", [480, 720, 960, 1100], { w: 960, h: 720 }, STORY_SIZES, {
    mobileWidths: [480, 720],
  }),
  service: ladder("local-service", [480, 720, 960, 1100], { w: 960, h: 720 }, STORY_SIZES, {
    mobileWidths: [480, 720],
  }),
  quiet: ladder("side-street", [480, 720, 960, 1100], { w: 720, h: 960 }, STORY_SIZES, {
    defaultWebpW: 720,
    mobileWidths: [480, 720],
  }),
  civic: ladder("civic-institutions", [480, 720, 960, 1100], { w: 960, h: 720 }, STORY_SIZES, {
    mobileWidths: [480, 720],
  }),
  /**
   * Below-fold story shot of the same map mock. Mobile-capped like other stories
   * (1100-only overserved ~761 CSS px). Lazy + fetchpriority=low keeps it off LCP
   * even though filenames overlap the hero ladder.
   */
  town: ladder("map-szeged", [480, 720, 960, 1100], { w: 960, h: 615 }, STORY_SIZES, {
    defaultWebpW: 720,
    mobileWidths: [480, 720],
  }),
} as const;

export const OVERVIEW_CLOSING = ladder(
  "visitor-hiker",
  [480, 720, 960, 1100],
  { w: 960, h: 637 },
  "(max-width: 860px) 92vw, 40vw",
  { mobileWidths: [480, 720] }
);

/** Preferred LCP preload candidate (mobile-capped ladder max). */
export const OVERVIEW_LCP_PRELOAD = "/marketing/map-szeged-480.webp";

/** Preload imagesrcset — must not list 960w or mobile will still download it. */
export const OVERVIEW_LCP_PRELOAD_SRCSET =
  "/marketing/map-szeged-480.webp 480w, /marketing/map-szeged-720.webp 720w";

export const OVERVIEW_LCP_PRELOAD_SIZES = "(max-width: 860px) 100vw, 36vw";

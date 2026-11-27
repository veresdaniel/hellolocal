import { describe, expect, it } from "vitest";
import {
  PATH_SEGMENT_KEYS,
  normalizePathSegmentSlug,
  pathSegmentsForLang,
} from "../../apps/api/src/ui-copy/path-segment.dict";
import { guideLangsForSitemapHost } from "../../apps/api/src/seo/public-path.util";

describe("path-segment.dict", () => {
  it("keeps hu/en/de production guide segments", () => {
    expect(pathSegmentsForLang("hu").guide).toBe("utmutato");
    expect(pathSegmentsForLang("en").guide).toBe("guide");
    expect(pathSegmentsForLang("de").guide).toBe("ratgeber");
    expect(pathSegmentsForLang("en").pricing).toBe("tarife");
  });

  it("falls back to English for unknown languages", () => {
    const map = pathSegmentsForLang("xx");
    expect(map.place).toBe("place");
    expect(map.guide).toBe("guide");
    expect(PATH_SEGMENT_KEYS.every((key) => typeof map[key] === "string")).toBe(true);
  });

  it("uses the French dictionary when present", () => {
    expect(pathSegmentsForLang("fr").place).toBe("lieu");
    expect(pathSegmentsForLang("fr-FR").guide).toBe("guide");
  });

  it("normalizes and validates slugs", () => {
    expect(normalizePathSegmentSlug("  Lieu  ")).toBe("lieu");
    expect(normalizePathSegmentSlug("mentions légales")).toBe("mentions-legales");
    expect(normalizePathSegmentSlug("")).toBeNull();
    expect(normalizePathSegmentSlug("---")).toBeNull();
  });
});

describe("guideLangsForSitemapHost", () => {
  it("exposes every language on .hu and .eu; none on hello-local.io", () => {
    expect(guideLangsForSitemapHost("https://hellolocal.hu", ["hu", "en", "de", "fr"])).toEqual([
      "hu",
      "en",
      "de",
      "fr",
    ]);
    expect(guideLangsForSitemapHost("https://hellolocal.eu", ["hu", "en", "de", "fr"])).toEqual([
      "hu",
      "en",
      "de",
      "fr",
    ]);
    expect(guideLangsForSitemapHost("https://hello-local.io", ["hu", "en"])).toEqual([]);
  });
});

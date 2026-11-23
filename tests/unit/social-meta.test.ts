import { describe, expect, it, afterEach } from "vitest";
import {
  applyHostScope,
  absoluteShareImage,
  parsePublicPath,
  publicOrigin,
  siteShare,
} from "../../apps/web/ssr/socialMeta.js";
import {
  FALLBACK_SHARE_IMAGE_PATH,
  normalizeShareImageUrl,
} from "../../apps/api/src/common/default-share-image";

describe("socialMeta publicOrigin", () => {
  const prev = process.env.FRONTEND_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prev;
  });

  it("prefers the request host over FRONTEND_URL for custom domains", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(publicOrigin("https://hellolocal.hu")).toBe("https://hellolocal.hu");
    expect(publicOrigin("https://helloetyek.hu")).toBe("https://helloetyek.hu");
  });

  it("falls back to FRONTEND_URL when request is localhost", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(publicOrigin("http://localhost:5173")).toBe("https://hello-local.io");
  });
});

describe("socialMeta absoluteShareImage", () => {
  it("builds same-origin absolute URLs for relative paths", () => {
    const image = absoluteShareImage("https://hellolocal.hu", FALLBACK_SHARE_IMAGE_PATH);
    expect(image.url).toBe(`https://hellolocal.hu${FALLBACK_SHARE_IMAGE_PATH}`);
    expect(image.width).toBeTruthy();
    expect(image.height).toBeTruthy();
  });

  it("keeps absolute https image URLs and sets default OG dimensions", () => {
    const image = absoluteShareImage(
      "https://hellolocal.hu",
      "https://cdn.example.com/share.jpg"
    );
    expect(image.url).toBe("https://cdn.example.com/share.jpg");
    expect(image.width).toBe("1200");
    expect(image.height).toBe("630");
  });

  it("replaces picsum placeholders with the same-origin marketing fallback", () => {
    const image = absoluteShareImage(
      "https://helloetyek.hu",
      "https://picsum.photos/seed/etyek-budai-hero/1800/900"
    );
    expect(image.url).toBe(`https://helloetyek.hu${FALLBACK_SHARE_IMAGE_PATH}`);
    expect(image.width).toBeTruthy();
    expect(image.height).toBeTruthy();
  });
});

describe("socialMeta parsePublicPath", () => {
  it("parses overview, site home, and collection detail", () => {
    expect(parsePublicPath("/hu/attekintes")).toEqual({ kind: "overview", lang: "hu" });
    expect(parsePublicPath("/hu/etyek")).toEqual({ kind: "site", lang: "hu", siteKey: "etyek" });
    expect(parsePublicPath("/hu/collections/borut")).toEqual({
      kind: "collection",
      lang: "hu",
      slug: "borut",
    });
  });

  it("parses place and event under a site key", () => {
    expect(parsePublicPath("/hu/etyek/hely/pince")).toEqual({
      kind: "place",
      lang: "hu",
      siteKey: "etyek",
      slug: "pince",
    });
    expect(parsePublicPath("/hu/etyek/event/fesztival")).toEqual({
      kind: "event",
      lang: "hu",
      siteKey: "etyek",
      slug: "fesztival",
    });
  });
});

describe("socialMeta applyHostScope", () => {
  it("maps site custom domain root to kind site", () => {
    const route = parsePublicPath("/hu");
    expect(
      applyHostScope(route, { kind: "site", slug: "etyek", defaultLang: "hu", domain: "helloetyek.hu" })
    ).toEqual({ kind: "site", lang: "hu", siteKey: "etyek" });
  });

  it("maps town custom domain root to kind town with entitySlug", () => {
    const route = parsePublicPath("/hu");
    expect(
      applyHostScope(route, {
        kind: "town",
        slug: "etyek",
        entitySlug: "budakeszi",
        defaultLang: "hu",
        domain: "budakeszi.example",
      })
    ).toEqual({ kind: "town", lang: "hu", siteKey: "etyek", slug: "budakeszi" });
  });

  it("maps place custom domain root to kind place with entitySlug", () => {
    const route = parsePublicPath("/hu");
    expect(
      applyHostScope(route, {
        kind: "place",
        slug: "etyek",
        entitySlug: "borostyan-pince",
        defaultLang: "hu",
        domain: "pince.example",
      })
    ).toEqual({ kind: "place", lang: "hu", siteKey: "etyek", slug: "borostyan-pince" });
  });

  it("maps event custom domain root to kind event with entitySlug", () => {
    const route = parsePublicPath("/hu");
    expect(
      applyHostScope(route, {
        kind: "event",
        slug: "etyek",
        entitySlug: "szuret",
        defaultLang: "hu",
        domain: "szuret.example",
      })
    ).toEqual({ kind: "event", lang: "hu", siteKey: "etyek", slug: "szuret" });
  });

  it("maps collection custom domain root to kind collection", () => {
    const route = parsePublicPath("/hu");
    expect(
      applyHostScope(route, {
        kind: "collection",
        slug: "borut",
        defaultLang: "hu",
        domain: "borut.example",
      })
    ).toEqual({ kind: "collection", lang: "hu", slug: "borut" });
  });

  it("still injects siteKey for nested paths on a site domain", () => {
    const route = parsePublicPath("/hu/hely/pince");
    expect(
      applyHostScope(route, { kind: "site", slug: "etyek", defaultLang: "hu", domain: "helloetyek.hu" })
    ).toEqual({ kind: "place", lang: "hu", siteKey: "etyek", slug: "pince" });
  });

  it("does not rewrite an already entity-specific path on a town domain", () => {
    const route = parsePublicPath("/hu/hely/pince");
    expect(
      applyHostScope(route, {
        kind: "town",
        slug: "etyek",
        entitySlug: "budakeszi",
        defaultLang: "hu",
        domain: "budakeszi.example",
      })
    ).toEqual({ kind: "place", lang: "hu", siteKey: "etyek", slug: "pince" });
  });
});

describe("normalizeShareImageUrl", () => {
  it("accepts absolute and root-relative URLs", () => {
    expect(normalizeShareImageUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg"
    );
    expect(normalizeShareImageUrl("/marketing/map-szeged.jpg")).toBe("/marketing/map-szeged.jpg");
    expect(normalizeShareImageUrl("//cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(normalizeShareImageUrl("not-a-url")).toBe("");
    expect(normalizeShareImageUrl("")).toBe("");
  });
});

describe("siteShare empty SEO cascade", () => {
  it("uses name / shortDescription / hero when SEO fields are empty", () => {
    const share = siteShare({
      site: {
        name: "Etyek",
        shortDescription: "Borvidék",
        description: "Hosszabb leírás",
        heroImage: "https://cdn.example.com/etyek.jpg",
      },
      seo: { defaultTitle: null, defaultDescription: null, defaultImage: null },
      placeholders: { placeHero: "https://cdn.example.com/placeholder.jpg" },
      platform: { defaultShareImage: "/marketing/map-szeged.jpg" },
      brand: { name: "HelloLocal" },
    });
    expect(share).toEqual({
      title: "Etyek",
      description: "Borvidék",
      siteName: "Etyek",
      hero: "https://cdn.example.com/etyek.jpg",
    });
  });

  it("prefers admin SEO overrides when set", () => {
    const share = siteShare({
      site: {
        name: "Etyek",
        shortDescription: "Borvidék",
        heroImage: "https://cdn.example.com/etyek.jpg",
      },
      seo: {
        defaultTitle: "Etyek · HelloLocal",
        defaultDescription: "Egyedi leírás",
        defaultImage: "https://cdn.example.com/og.jpg",
      },
      placeholders: { placeHero: "https://cdn.example.com/placeholder.jpg" },
      platform: { defaultShareImage: "/marketing/map-szeged.jpg" },
    });
    expect(share?.title).toBe("Etyek · HelloLocal");
    expect(share?.description).toBe("Egyedi leírás");
    expect(share?.hero).toBe("https://cdn.example.com/og.jpg");
  });

  it("falls back to platform defaultShareImage when hero and seoImage are empty", () => {
    const share = siteShare({
      site: { name: "Etyek", shortDescription: "Borvidék", heroImage: null },
      seo: {},
      placeholders: { placeHero: null },
      platform: { defaultShareImage: "/marketing/map-szeged.jpg" },
    });
    expect(share?.hero).toBe("/marketing/map-szeged.jpg");
  });
});

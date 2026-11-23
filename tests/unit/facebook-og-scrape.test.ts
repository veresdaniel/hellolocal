import { afterEach, describe, expect, it, vi } from "vitest";
import { FacebookOgScrapeService } from "../../apps/api/src/seo/facebook-og-scrape.service";
import {
  publicOriginFromHeaders,
  rebasePublicUrl,
} from "../../apps/api/src/seo/public-path.util";

function serviceWithPrisma(prisma: unknown = { site: { findUnique: vi.fn() } }) {
  return new FacebookOgScrapeService(prisma as never);
}

describe("FacebookOgScrapeService", () => {
  const prevId = process.env.FACEBOOK_APP_ID;
  const prevSecret = process.env.FACEBOOK_APP_SECRET;
  const prevFrontend = process.env.FRONTEND_URL;

  afterEach(() => {
    if (prevId === undefined) delete process.env.FACEBOOK_APP_ID;
    else process.env.FACEBOOK_APP_ID = prevId;
    if (prevSecret === undefined) delete process.env.FACEBOOK_APP_SECRET;
    else process.env.FACEBOOK_APP_SECRET = prevSecret;
    if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prevFrontend;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports not_configured without inventing success when env is missing", async () => {
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    const svc = serviceWithPrisma();
    expect(svc.isConfigured()).toBe(false);

    const result = await svc.scrapeUrls(["https://helloetyek.hu/hu"]);
    expect(result.configured).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.results[0]?.status).toBe("not_configured");
    expect(result.results[0]?.message).toMatch(/FACEBOOK_APP_ID/);
  });

  it("POSTs scrape=true with app token when configured", async () => {
    process.env.FACEBOOK_APP_ID = "app123";
    process.env.FACEBOOK_APP_SECRET = "secret456";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://helloetyek.hu/hu" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await serviceWithPrisma().scrapeUrls(["https://helloetyek.hu/hu"]);
    expect(result.configured).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.results[0]?.status).toBe("success");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] || "");
    expect(calledUrl).toContain("graph.facebook.com");
    expect(calledUrl).toContain("scrape=true");
    expect(calledUrl).toContain(encodeURIComponent("https://helloetyek.hu/hu"));
    expect(calledUrl).toContain(encodeURIComponent("app123|secret456"));
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });

  it("surfaces Graph API errors without claiming success", async () => {
    process.env.FACEBOOK_APP_ID = "app123";
    process.env.FACEBOOK_APP_SECRET = "secret456";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Invalid URL", type: "OAuthException", code: 100 },
        }),
      })
    );

    const result = await serviceWithPrisma().scrapeUrls(["https://example.com/hu"]);
    expect(result.ok).toBe(false);
    expect(result.results[0]?.status).toBe("error");
    expect(result.results[0]?.message).toMatch(/Invalid URL/);
  });

  it("builds site public URLs from primaryDomain", async () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    const findUnique = vi.fn().mockResolvedValue({
      slug: "etyek",
      primaryDomain: "helloetyek.hu",
      siteDomains: [],
      translations: [{ lang: "hu" }, { lang: "en" }],
    });
    const urls = await serviceWithPrisma({ site: { findUnique } }).urlsForSite("site-1");
    expect(urls).toEqual(["https://helloetyek.hu/hu", "https://helloetyek.hu/en"]);
  });

  it("falls back to platform FRONTEND_URL + slug when no custom domain", async () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    const findUnique = vi.fn().mockResolvedValue({
      slug: "etyek",
      primaryDomain: null,
      siteDomains: [],
      translations: [{ lang: "hu" }],
    });
    const urls = await serviceWithPrisma({ site: { findUnique } }).urlsForSite("site-1");
    expect(urls).toEqual(["https://hello-local.io/hu/etyek"]);
  });
});

describe("publicOriginFromHeaders (Nest ↔ socialMeta sync)", () => {
  const prev = process.env.FRONTEND_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prev;
  });

  it("prefers request host over FRONTEND_URL for custom domains", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(
      publicOriginFromHeaders({
        host: "helloetyek.hu",
        "x-forwarded-proto": "https",
      })
    ).toBe("https://helloetyek.hu");
  });

  it("does not emit api.* as og origin", () => {
    process.env.FRONTEND_URL = "https://hello-local.io";
    expect(
      publicOriginFromHeaders({
        host: "api.hello-local.io",
        "x-forwarded-proto": "https",
      })
    ).toBe("https://hello-local.io");
  });

  it("rebases path URLs onto the request origin", () => {
    expect(rebasePublicUrl("https://hello-local.io/hu/etyek", "https://helloetyek.hu")).toBe(
      "https://helloetyek.hu/hu/etyek"
    );
    expect(rebasePublicUrl("/hu/etyek", "https://helloetyek.hu")).toBe(
      "https://helloetyek.hu/hu/etyek"
    );
  });
});

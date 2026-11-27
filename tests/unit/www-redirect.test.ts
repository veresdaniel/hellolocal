import { describe, expect, it, vi } from "vitest";
import {
  createPlatformHostLoader,
  platformHostCanonicalTarget,
  wwwToApexTarget,
} from "../../apps/web/ssr/wwwRedirect.js";

const entries = [
  { host: "hellolocal.hu", lang: "hu" as const },
  { host: "hellolocal.eu", lang: "en" as const },
];

describe("platformHostCanonicalTarget", () => {
  it("redirects www to apex and bare / to the host language", () => {
    expect(platformHostCanonicalTarget("www.hellolocal.hu", entries, "/")).toBe(
      "https://hellolocal.hu/hu"
    );
    expect(platformHostCanonicalTarget("hellolocal.hu", entries, "/")).toBe(
      "https://hellolocal.hu/hu"
    );
    expect(platformHostCanonicalTarget("hellolocal.eu", entries, "/")).toBe(
      "https://hellolocal.eu/en"
    );
    expect(platformHostCanonicalTarget("www.hellolocal.hu", entries, "/hu/regiok?x=1")).toBe(
      "https://hellolocal.hu/hu/regiok?x=1"
    );
  });

  it("redirects legacy overview segments to /:lang", () => {
    expect(platformHostCanonicalTarget("hellolocal.hu", entries, "/attekintes")).toBe(
      "https://hellolocal.hu/hu"
    );
    expect(platformHostCanonicalTarget("hellolocal.hu", entries, "/hu/attekintes")).toBe(
      "https://hellolocal.hu/hu"
    );
    expect(platformHostCanonicalTarget("hellolocal.eu", entries, "/en/overview")).toBe(
      "https://hellolocal.eu/en"
    );
  });

  it("leaves language roots and unknown hosts alone", () => {
    expect(platformHostCanonicalTarget("hellolocal.hu", entries, "/hu")).toBeNull();
    expect(platformHostCanonicalTarget("www.helloetyek.hu", entries, "/")).toBeNull();
    expect(platformHostCanonicalTarget("hellolocal.hu", [], "/")).toBeNull();
  });
});

describe("wwwToApexTarget", () => {
  it("still redirects www platform hosts", () => {
    expect(wwwToApexTarget("www.hellolocal.hu", ["hellolocal.hu"], "/hu")).toBe(
      "https://hellolocal.hu/hu"
    );
  });
});

describe("createPlatformHostLoader", () => {
  it("caches entries with lang and fails open on API errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hosts: ["hellolocal.hu", "hellolocal.eu"],
          entries: [
            { host: "hellolocal.hu", lang: "hu" },
            { host: "www.hellolocal.eu", lang: "en" },
          ],
        }),
      })
      .mockRejectedValue(new Error("down"));
    const load = createPlatformHostLoader("http://api", { ttlMs: 60_000, fetchImpl });
    expect(await load()).toEqual([
      { host: "hellolocal.hu", lang: "hu" },
      { host: "hellolocal.eu", lang: "en" },
    ]);
    expect(await load()).toEqual([
      { host: "hellolocal.hu", lang: "hu" },
      { host: "hellolocal.eu", lang: "en" },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const broken = createPlatformHostLoader("http://api", {
      fetchImpl: vi.fn().mockRejectedValue(new Error("down")),
    });
    expect(await broken()).toEqual([]);
  });
});

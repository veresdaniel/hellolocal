import { describe, expect, it } from "vitest";
import {
  overviewLang,
  overviewShareUrl,
} from "../../apps/web/ssr/renderOverview.js";

describe("overviewLang", () => {
  it("treats apex / as the marketing landing (fallback lang)", () => {
    expect(overviewLang("/")).toBe("hu");
    expect(overviewLang("")).toBe("hu");
  });

  it("treats /:lang and /:lang/overview as landing", () => {
    expect(overviewLang("/hu")).toBe("hu");
    expect(overviewLang("/en")).toBe("en");
    expect(overviewLang("/hu/attekintes")).toBe("hu");
    expect(overviewLang("/en/overview")).toBe("en");
    expect(overviewLang("/de/ueberblick")).toBe("de");
  });

  it("ignores non-landing paths", () => {
    expect(overviewLang("/hu/regiok")).toBeNull();
    expect(overviewLang("/hu/etyek")).toBeNull();
  });
});

describe("overviewShareUrl", () => {
  const origin = "https://hellolocal.hu";

  it("keeps apex and bare lang without overview segment", () => {
    expect(overviewShareUrl(origin, "/", "hu")).toBe("https://hellolocal.hu/");
    expect(overviewShareUrl(origin, "/hu", "hu")).toBe("https://hellolocal.hu/hu");
    expect(overviewShareUrl(origin, "/en", "en")).toBe("https://hellolocal.hu/en");
  });

  it("uses the localized overview path when that segment is present", () => {
    expect(overviewShareUrl(origin, "/hu/attekintes", "hu")).toBe(
      "https://hellolocal.hu/hu/attekintes"
    );
    expect(overviewShareUrl(origin, "/en/overview", "en")).toBe(
      "https://hellolocal.hu/en/overview"
    );
  });
});

import { describe, expect, it } from "vitest";
import { normalizeDomainHost } from "../../apps/api/src/common/domain-host";
import { assignMissingSlugs, fallbackSlug, generateSlug } from "../../apps/api/src/slug/slug.helper";
import { pathForHostResolve } from "../../apps/web/src/app/hostResolve";
import { entityPublicAddress, isPlatformHost, regionAddress } from "../../apps/web/src/app/urls";

describe("normalizeDomainHost", () => {
  it("keeps a bare host and strips scheme, port, path and trailing dots", () => {
    expect(normalizeDomainHost("  HTTPS://Etyek.HU:443/helyek?q=1  ")).toBe("etyek.hu");
    expect(normalizeDomainHost("//www.pelda.hu.")).toBe("www.pelda.hu");
    expect(normalizeDomainHost("user:pass@etyek.hu")).toBe("etyek.hu");
    expect(normalizeDomainHost("etyek.hu, evil.example")).toBe("etyek.hu");
  });

  it("rejects platform hosts, localhost, ips and broken labels", () => {
    expect(normalizeDomainHost("hello-local.io")).toBeNull();
    expect(normalizeDomainHost("www.hello-local.io")).toBeNull();
    expect(normalizeDomainHost("api.hello-local.io")).toBeNull();
    expect(normalizeDomainHost("localhost")).toBeNull();
    expect(normalizeDomainHost("127.0.0.1")).toBeNull();
    expect(normalizeDomainHost("etyek")).toBeNull();
    expect(normalizeDomainHost("etyek..hu")).toBeNull();
    expect(normalizeDomainHost("-etyek.hu")).toBeNull();
    expect(normalizeDomainHost("")).toBeNull();
    expect(normalizeDomainHost(null)).toBeNull();
  });
});

describe("slug fallback", () => {
  it("normalizes accents and prefers the first real slug", () => {
    expect(generateSlug("Étyek Budai")).toBe("etyek-budai");
    expect(generateSlug("  Hello---Local! ")).toBe("hello-local");
    expect(fallbackSlug("  ", null, "boraszat", "place-id")).toBe("boraszat");
    expect(fallbackSlug("", undefined)).toBeNull();
    expect(fallbackSlug(undefined, "clplace123")).toBe("clplace123");
  });

  it("does not replace a slug that is already filled", () => {
    const slugs = new Map<string, string>([["place-1", "requested"]]);
    assignMissingSlugs(slugs, [
      { entityId: "place-1", slug: "hungarian" },
      { entityId: "place-2", slug: "  " },
      { entityId: "place-2", slug: "pince" },
    ]);
    expect(slugs.get("place-1")).toBe("requested");
    expect(slugs.get("place-2")).toBe("pince");
  });
});

describe("region address", () => {
  it("uses the custom host when one is set and the slug path otherwise", () => {
    expect(regionAddress({ lang: "hu", slug: "etyek-budai" })).toBe("/hu/etyek-budai");
    expect(regionAddress({ lang: "hu", slug: "etyek-budai", primaryDomain: "   " })).toBe(
      "/hu/etyek-budai"
    );
    expect(
      regionAddress({
        lang: "en",
        slug: "etyek-budai",
        primaryDomain: "https://etyek.hu/ignored",
        path: "/place/pince",
      })
    ).toBe("https://etyek.hu/en/etyek-budai/place/pince");
    expect(isPlatformHost("Hello-Local.io:443")).toBe(true);
    expect(isPlatformHost("beta.hello-local.io")).toBe(true);
    expect(isPlatformHost("api.beta.hello-local.io")).toBe(true);
    expect(isPlatformHost("etyek.hu")).toBe(false);
  });
});

describe("town/place custom domain addresses", () => {
  it("prefers the entity customDomain root over the region path", () => {
    expect(
      entityPublicAddress({
        lang: "hu",
        siteSlug: "etyek-budai",
        entityType: "place",
        entitySlug: "borostyan",
        primaryDomain: "etyek.hu",
        customDomain: "borostyan.hu",
      })
    ).toBe("https://borostyan.hu/");
    expect(
      entityPublicAddress({
        lang: "hu",
        siteSlug: "etyek-budai",
        entityType: "town",
        entitySlug: "etyek",
        primaryDomain: "etyek-region.hu",
      })
    ).toBe("https://etyek-region.hu/hu/etyek-budai/telepules/etyek");
  });

  it("maps host resolve kinds to the public entity path", () => {
    expect(
      pathForHostResolve({
        kind: "site",
        slug: "etyek-budai",
        defaultLang: "hu",
      })
    ).toBe("/hu/etyek-budai");
    expect(
      pathForHostResolve({
        kind: "town",
        slug: "etyek-budai",
        defaultLang: "en",
        entitySlug: "etyek",
      })
    ).toBe("/en/etyek-budai/town/etyek");
    expect(
      pathForHostResolve({
        kind: "place",
        slug: "etyek-budai",
        defaultLang: "de",
        entitySlug: "pince",
      })
    ).toBe("/de/etyek-budai/ort/pince");
  });
});

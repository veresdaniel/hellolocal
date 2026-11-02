import { describe, expect, it, vi } from "vitest";
import { isKnownPublicHostname } from "../../apps/api/src/common/is-known-public-hostname";

function mockPrisma(overrides: {
  siteDomain?: unknown;
  sitePrimary?: unknown;
  town?: unknown;
  place?: unknown;
  collection?: unknown;
}) {
  return {
    siteDomain: {
      findUnique: vi.fn().mockResolvedValue(overrides.siteDomain ?? null),
    },
    site: {
      findFirst: vi.fn().mockResolvedValue(overrides.sitePrimary ?? null),
    },
    town: {
      findUnique: vi.fn().mockResolvedValue(overrides.town ?? null),
    },
    place: {
      findUnique: vi.fn().mockResolvedValue(overrides.place ?? null),
    },
    collection: {
      findUnique: vi.fn().mockResolvedValue(overrides.collection ?? null),
    },
    countryDomain: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    country: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  } as never;
}

describe("isKnownPublicHostname", () => {
  it("rejects platform / empty hosts without querying", async () => {
    const prisma = mockPrisma({});
    expect(await isKnownPublicHostname(prisma, "hello-local.io")).toBe(false);
    expect(await isKnownPublicHostname(prisma, "")).toBe(false);
    expect(prisma.siteDomain.findUnique).not.toHaveBeenCalled();
  });

  it("accepts an active SiteDomain row", async () => {
    const prisma = mockPrisma({
      siteDomain: { isActive: true, site: { isActive: true } },
    });
    expect(await isKnownPublicHostname(prisma, "https://HelloEtyek.hu/")).toBe(true);
  });

  it("accepts Site.primaryDomain fallback", async () => {
    const prisma = mockPrisma({ sitePrimary: { id: "site-1" } });
    expect(await isKnownPublicHostname(prisma, "helloetyek.hu")).toBe(true);
  });

  it("rejects inactive town custom domains", async () => {
    const prisma = mockPrisma({
      town: { isActive: false, site: { isActive: true } },
    });
    expect(await isKnownPublicHostname(prisma, "town.example.hu")).toBe(false);
  });
});

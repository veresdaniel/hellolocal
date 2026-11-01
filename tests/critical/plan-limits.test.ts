import { describe, expect, it } from "vitest";
import { AdminPlaceService } from "../../apps/api/src/admin/admin-place.service";
import { AdminSiteService } from "../../apps/api/src/admin/admin-site.service";
import {
  PUBLIC_PLAN_DEFAULTS,
  resolvePublicPlans,
  syncMatrixLimitsFromPublicPlans,
  syncPublicPlansFromMatrixLimits,
} from "../../apps/web/src/components/publicPlans";

function placeService(options: {
  placesMax: number;
  count?: number;
  onCount?: () => void;
  onCreate?: () => Promise<unknown>;
}) {
  const prisma = {
    place: {
      count: async () => {
        options.onCount?.();
        return options.count ?? 0;
      },
      create: async () => options.onCreate?.() ?? {},
      findFirst: async () => null,
    },
    town: {
      findFirst: async () => ({ id: "town-1" }),
    },
    siteDomain: { findUnique: async () => null },
    site: { findFirst: async () => null },
    collection: { findUnique: async () => null },
  };
  const entitlements = {
    getBySiteId: async () => ({ limits: { placesMax: options.placesMax } }),
  };
  return new AdminPlaceService(prisma as never, {} as never, {} as never, entitlements as never);
}

function siteService(options: {
  plan?: string;
  subscription?: { plan: string; status: string; validUntil: Date | null } | null;
  overrides?: unknown;
  languagesMax?: number;
}) {
  const prisma = {
    site: { findUnique: async () => ({ plan: options.plan ?? "basic" }) },
    siteSubscription: { findUnique: async () => options.subscription ?? null },
    brand: { findFirst: async () => ({ planOverrides: options.overrides ?? null }) },
  };
  const entitlements = {
    getBySiteId: async () => ({ limits: { languagesMax: options.languagesMax ?? 1 } }),
  };
  return new AdminSiteService(prisma as never, entitlements as never);
}

const draft = {
  siteId: "site-1",
  townId: "town-1",
  categoryId: "category-1",
  translations: [],
};

describe("place capacity", () => {
  it("refuses another active place once placesMax is reached", async () => {
    let created = 0;
    const service = placeService({
      placesMax: 3,
      count: 3,
      onCreate: async () => {
        created += 1;
        return {};
      },
    });
    await expect(service.create({ ...draft, isActive: true })).rejects.toThrow(/helykerete/);
    expect(created).toBe(0);
  });

  it("does not count a draft, and an unlimited plan skips the query", async () => {
    let counts = 0;
    const drafts = placeService({
      placesMax: 1,
      count: 99,
      onCount: () => {
        counts += 1;
      },
      onCreate: async () => {
        throw new Error("stored");
      },
    });
    await expect(drafts.create({ ...draft })).rejects.toThrow(/stored/);
    await expect(drafts.create({ ...draft, isActive: false })).rejects.toThrow(/stored/);
    expect(counts).toBe(0);

    const open = placeService({
      placesMax: Number.POSITIVE_INFINITY,
      onCount: () => {
        counts += 1;
      },
      onCreate: async () => {
        throw new Error("stored");
      },
    });
    await expect(open.create({ ...draft, isActive: true })).rejects.toThrow(/stored/);
    expect(counts).toBe(0);
  });

  it("checks the cap again when an existing place is published", async () => {
    const service = placeService({ placesMax: 1, count: 1 }) as unknown as {
      findOne: () => Promise<{ isActive: boolean; isFeatured: boolean }>;
      update: AdminPlaceService["update"];
    };
    service.findOne = async () => ({ isActive: false, isFeatured: false });
    await expect(service.update("place-1", "site-1", { isActive: true })).rejects.toThrow(
      /helykerete/
    );
  });
});

describe("language and custom domain gates", () => {
  it("blocks language growth above languagesMax and still allows a shrink", async () => {
    const service = siteService({ languagesMax: 1 }) as unknown as {
      assertCanGrowLanguages: (siteId: string, current: string[], next: string[]) => Promise<void>;
    };
    await service.assertCanGrowLanguages("site-1", ["hu"], ["hu"]);
    await service.assertCanGrowLanguages("site-1", ["hu", "en"], ["hu"]);
    await expect(service.assertCanGrowLanguages("site-1", ["hu"], ["hu", "en"])).rejects.toThrow(
      /1 nyelv/
    );

    const open = siteService({ languagesMax: Number.POSITIVE_INFINITY }) as unknown as {
      assertCanGrowLanguages: (siteId: string, current: string[], next: string[]) => Promise<void>;
    };
    await open.assertCanGrowLanguages("site-1", ["hu"], ["hu", "en", "de", "fr"]);
  });

  it("blocks a custom domain on basic and caps pro aliases", async () => {
    const basic = siteService({ plan: "basic" }) as unknown as {
      assertCanSaveDomains: (siteId: string, count: number) => Promise<void>;
    };
    await expect(basic.assertCanSaveDomains("site-1", 1)).rejects.toThrow(/Basic/);

    const pro = siteService({ plan: "pro" }) as unknown as {
      assertCanSaveDomains: (siteId: string, count: number) => Promise<void>;
    };
    await pro.assertCanSaveDomains("site-1", 6);
    await expect(pro.assertCanSaveDomains("site-1", 7)).rejects.toThrow(/további domain/);

    const business = siteService({ plan: "business" }) as unknown as {
      assertCanSaveDomains: (siteId: string, count: number) => Promise<void>;
    };
    await business.assertCanSaveDomains("site-1", 12);
  });

  it("lets a saved override open or close the domain, and ignores an expired upgrade", async () => {
    const opened = siteService({
      plan: "basic",
      overrides: { BASIC: { features: { customDomainEnabled: true }, limits: { domainAliasesMax: 0 } } },
    }) as unknown as {
      assertCanSaveDomains: (siteId: string, count: number) => Promise<void>;
    };
    await opened.assertCanSaveDomains("site-1", 1);
    await expect(opened.assertCanSaveDomains("site-1", 2)).rejects.toThrow(/további domain/);

    const expired = siteService({
      plan: "basic",
      subscription: { plan: "PRO", status: "ACTIVE", validUntil: new Date("2000-01-01") },
    }) as unknown as {
      assertCanSaveDomains: (siteId: string, count: number) => Promise<void>;
    };
    await expect(expired.assertCanSaveDomains("site-1", 1)).rejects.toThrow(/Basic/);
  });
});

describe("public plan numbers", () => {
  it("prefers finite matrix limits over stale publicPlans marketing numbers", () => {
    const defaults = resolvePublicPlans(null);
    expect(defaults.free.places).toBe(PUBLIC_PLAN_DEFAULTS.free.places);
    expect(defaults.basic.places).toBe(PUBLIC_PLAN_DEFAULTS.basic.places);
    expect(defaults.premium.places).toBe(PUBLIC_PLAN_DEFAULTS.premium.places);
    expect(defaults.free.places).toBeLessThan(defaults.basic.places);
    expect(defaults.basic.places).toBeLessThan(defaults.premium.places);
    expect(defaults.free.languages).toBe(1);
    expect(defaults.premium.languages).toBe(3);

    const resolved = resolvePublicPlans({
      BASIC: { limits: { placesMax: 12, languagesMax: 2, eventsPerMonthMax: Number.POSITIVE_INFINITY } },
      PRO: { limits: { placesMax: Number.POSITIVE_INFINITY, languagesMax: 9 } },
      publicPlans: { premium: { places: 40, languages: 4 } },
    });
    expect(resolved.basic.places).toBe(12);
    expect(resolved.basic.languages).toBe(2);
    expect(resolved.basic.events).toBe(PUBLIC_PLAN_DEFAULTS.basic.events);
    // Infinity placesMax is ignored; publicPlans places still apply.
    expect(resolved.premium.places).toBe(40);
    // Finite languagesMax from PRO wins over publicPlans.
    expect(resolved.premium.languages).toBe(9);
    expect(resolved.free.places).toBe(PUBLIC_PLAN_DEFAULTS.free.places);
  });

  it("syncs finite matrix limits into publicPlans and back without touching municipal", () => {
    const fromMatrix = syncPublicPlansFromMatrixLimits({
      BASIC: { limits: { placesMax: 22, eventsPerMonthMax: 11, languagesMax: 2 } },
      PRO: { limits: { placesMax: Number.POSITIVE_INFINITY, languagesMax: 5 } },
      MUNICIPAL: { limits: { placesMax: Number.POSITIVE_INFINITY } },
      publicPlans: {
        basic: { priceHuf: 3990, places: 30, events: 30, languages: 1 },
        premium: { priceHuf: 8990, places: 150, events: 200, languages: 3 },
      },
    });
    expect(fromMatrix.publicPlans.basic).toEqual({
      priceHuf: 3990,
      places: 22,
      events: 11,
      languages: 2,
    });
    expect(fromMatrix.publicPlans.premium.languages).toBe(5);
    expect(fromMatrix.publicPlans.premium.places).toBe(150);
    expect(fromMatrix.MUNICIPAL.limits.placesMax).toBe(Number.POSITIVE_INFINITY);

    const fromPublic = syncMatrixLimitsFromPublicPlans({
      publicPlans: {
        free: { priceHuf: 0, places: 4, events: 0, languages: 1 },
        basic: { priceHuf: 3990, places: 25, events: 15, languages: 2 },
        premium: { priceHuf: 8990, places: 80, events: 90, languages: 3 },
      },
    });
    expect(fromPublic.FREE.limits).toEqual({
      placesMax: 4,
      eventsPerMonthMax: 0,
      languagesMax: 1,
    });
    expect(fromPublic.BASIC.limits.placesMax).toBe(25);
    expect(fromPublic.PRO.limits.eventsPerMonthMax).toBe(90);
    expect(fromPublic.MUNICIPAL).toBeUndefined();
  });
});

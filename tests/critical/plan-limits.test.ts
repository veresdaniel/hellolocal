import { describe, expect, it } from "vitest";
import { AdminPlaceService } from "../../apps/api/src/admin/admin-place.service";
import { AdminSiteService } from "../../apps/api/src/admin/admin-site.service";
import { PLAN_DEFS } from "../../apps/api/src/entitlements/entitlements.config";
import { EntitlementsService } from "../../apps/api/src/entitlements/entitlements.service";
import {
  PUBLIC_PLAN_DEFAULTS,
  resolvePublicPlans,
  syncMatrixLimitsFromPublicPlans,
  syncPublicPlansFromMatrixLimits,
} from "../../apps/web/src/components/publicPlans";

function placeService(options: { rejectWhenActive?: boolean; onCreate?: () => Promise<unknown> } = {}) {
  const calls: Array<{ actor?: string; siteId: string; active: boolean }> = [];
  const prisma = {
    place: {
      create: async () => options.onCreate?.() ?? {},
      update: async () => options.onCreate?.() ?? {},
      findFirst: async () => null,
    },
    town: {
      findFirst: async () => ({ id: "town-1" }),
    },
  };
  const entitlements = {
    assertCanAddPlace: async (actor: string | undefined, siteId: string, active: boolean) => {
      calls.push({ actor, siteId, active });
      if (active && options.rejectWhenActive) {
        throw new Error("A régió helykerete betelt (3/3).");
      }
    },
  };
  return {
    calls,
    service: new AdminPlaceService(prisma as never, {} as never, {} as never, entitlements as never),
  };
}

function entitlements(options: {
  role?: string;
  regionEditorSiteIds?: string[];
  townIds?: string[];
  townInSite?: boolean;
  customerPlans?: string[];
  customerPlaces?: number;
  staffPlaces?: number;
  events?: number;
  subscription?: { plan: string; status: string; validUntil: Date | null } | null;
  overrides?: unknown;
  placeOwnerId?: string | null;
}) {
  const prisma = {
    user: { findUnique: async () => ({ role: options.role ?? "editor" }) },
    town: { findFirst: async () => (options.townInSite ? { id: "town-1" } : null) },
    place: {
      findMany: async () => (options.customerPlans ?? []).map((plan) => ({ plan })),
      findUnique: async () => ({ ownerId: options.placeOwnerId ?? null }),
      count: async (args: { where?: { OR?: unknown } }) =>
        args?.where?.OR ? (options.customerPlaces ?? 0) : (options.staffPlaces ?? 0),
    },
    event: { count: async () => options.events ?? 0 },
    siteSubscription: {
      findUnique: async () =>
        options.subscription === undefined
          ? { plan: "BASIC", status: "ACTIVE", validUntil: null }
          : options.subscription,
    },
    brand: { findFirst: async () => ({ planOverrides: options.overrides ?? null }) },
    siteMembership: { count: async () => 0 },
    siteDomain: { count: async () => 0 },
    site: { findUnique: async () => ({ languages: ["hu"], plan: "municipal" }) },
    gallery: { count: async () => 0 },
  };
  const rbac = {
    getContentScope: async () => ({
      unrestricted: false,
      regionEditorSiteIds: options.regionEditorSiteIds ?? [],
      townIds: options.townIds ?? [],
    }),
  };
  return new EntitlementsService(prisma as never, {} as never, rbac as never);
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
  it("refuses to store an active place when the entitlement check fails", async () => {
    let created = 0;
    const harness = placeService({
      rejectWhenActive: true,
      onCreate: async () => {
        created += 1;
        return {};
      },
    });
    await expect(harness.service.create({ ...draft, isActive: true }, "editor-1")).rejects.toThrow(
      /helykerete/
    );
    expect(created).toBe(0);
    expect(harness.calls).toEqual([{ actor: "editor-1", siteId: "site-1", active: true }]);
  });

  it("asks for a slot only when the place will be active", async () => {
    const harness = placeService({
      onCreate: async () => {
        throw new Error("stored");
      },
    });
    await expect(harness.service.create({ ...draft })).rejects.toThrow(/stored/);
    await expect(harness.service.create({ ...draft, isActive: false })).rejects.toThrow(/stored/);
    expect(harness.calls.map((call) => call.active)).toEqual([false, false]);
  });

  it("rechecks a staff place when it is published, and skips a customer place", async () => {
    const staff = placeService({ rejectWhenActive: true });
    (staff.service as unknown as { findOne: () => Promise<unknown> }).findOne = async () => ({
      isActive: false,
      isFeatured: false,
      ownerId: null,
    });
    await expect(staff.service.update("place-1", "site-1", { isActive: true }, "editor-1")).rejects.toThrow(
      /helykerete/
    );
    expect(staff.calls).toEqual([{ actor: "editor-1", siteId: "site-1", active: true }]);

    const owned = placeService({ rejectWhenActive: true });
    (owned.service as unknown as { findOne: () => Promise<unknown> }).findOne = async () => ({
      isActive: false,
      isFeatured: false,
      ownerId: "customer-1",
    });
    await expect(owned.service.update("place-2", "site-1", { isActive: true }, "editor-1")).rejects.toThrow(
      /findUnique/
    );
    expect(owned.calls).toEqual([]);
  });
});

describe("customer and region quotas", () => {
  it("keeps Több telephely at 30 and leaves unlimited to the municipal plan", () => {
    expect(PLAN_DEFS.PRO.limits.placesMax).toBe(30);
    expect(PLAN_DEFS.PRO.limits.eventsPerMonthMax).toBe(30);
    expect(PLAN_DEFS.BUSINESS.limits.placesMax).toBe(30);
    expect(PLAN_DEFS.BUSINESS.limits.eventsPerMonthMax).toBe(30);
    expect(PLAN_DEFS.MUNICIPAL.limits.placesMax).toBe(Number.POSITIVE_INFINITY);
  });

  it("uses the region subscription for staff and ignores a municipal label on the region row", async () => {
    const full = entitlements({ regionEditorSiteIds: ["site-1"], staffPlaces: 5 });
    await expect(full.assertCanAddPlace("editor-1", "site-1", true)).rejects.toThrow(/régió helykerete/);

    const draft = entitlements({ regionEditorSiteIds: ["site-1"], staffPlaces: 99 });
    await draft.assertCanAddPlace("editor-1", "site-1", false);

    const municipal = entitlements({
      regionEditorSiteIds: ["site-1"],
      staffPlaces: 80,
      subscription: { plan: "MUNICIPAL", status: "ACTIVE", validUntil: null },
    });
    await municipal.assertCanAddPlace("editor-1", "site-1", true);
  });

  it("ignores a saved Infinity override and keeps the municipal cap as the only unlimited plan", async () => {
    const capped = entitlements({
      regionEditorSiteIds: ["site-1"],
      staffPlaces: 5,
      overrides: { BASIC: { limits: { placesMax: Number.POSITIVE_INFINITY } } },
    });
    await expect(capped.assertCanAddPlace("editor-1", "site-1", true)).rejects.toThrow(/régió helykerete/);
  });

  it("lets a superadmin pass a full region", async () => {
    const service = entitlements({ role: "superadmin", staffPlaces: 99 });
    await service.assertCanAddPlace("super-1", "site-1", true);
  });

  it("counts a customer's own places, including drafts, on Egy hely", async () => {
    const taken = entitlements({ customerPlans: ["free"], customerPlaces: 1 });
    await expect(taken.assertCanAddPlace("customer-1", "site-1", false)).rejects.toThrow(/1 helyet/);

    const open = entitlements({ customerPlans: ["free"], customerPlaces: 0, staffPlaces: 99 });
    await open.assertCanAddPlace("customer-1", "site-1", true);
  });

  it("raises the customer cap from the highest place plan", async () => {
    const room = entitlements({ customerPlans: ["free", "pro"], customerPlaces: 29 });
    await room.assertCanAddPlace("customer-1", "site-1", true);

    const full = entitlements({ customerPlans: ["pro"], customerPlaces: 30 });
    await expect(full.assertCanAddPlace("customer-1", "site-1", true)).rejects.toThrow(/30 helyet/);
  });

  it("charges a town admin to the region, and a customer event to the owner", async () => {
    const townAdmin = entitlements({
      townIds: ["town-1"],
      townInSite: true,
      staffPlaces: 5,
      customerPlaces: 0,
    });
    await expect(townAdmin.assertCanAddPlace("town-user", "site-1", true)).rejects.toThrow(
      /régió helykerete/
    );

    const customerEvent = entitlements({
      placeOwnerId: "customer-1",
      customerPlans: ["free"],
      events: 5,
    });
    await expect(customerEvent.assertCanAddEvent("editor-1", "site-1", "place-1")).rejects.toThrow(
      /előfizetésed havi eseménykerete/
    );

    const regionEvent = entitlements({ placeOwnerId: null, events: 15 });
    await expect(regionEvent.assertCanAddEvent("editor-1", "site-1", "place-1")).rejects.toThrow(
      /régió havi eseménykerete/
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
    expect(defaults.premium.languages).toBe(1);
    expect(defaults.free.places).toBe(1);
    expect(defaults.basic.places).toBe(5);
    expect(defaults.premium.places).toBe(30);

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

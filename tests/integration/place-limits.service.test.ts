import { describe, expect, it } from "vitest";
import { AdminPlaceService } from "../../apps/api/src/admin/admin-place.service";

/**
 * Service-level integration against a mocked Prisma + entitlements (no production DB).
 * Command: pnpm test:integration
 */
function placeService(options: { placesMax: number; count?: number }) {
  let created = 0;
  const prisma = {
    place: {
      count: async () => options.count ?? 0,
      create: async () => {
        created += 1;
        return { id: "place-new" };
      },
      findFirst: async () => null,
    },
  };
  const entitlements = {
    getBySiteId: async () => ({ limits: { placesMax: options.placesMax } }),
  };
  return {
    getCreated: () => created,
    service: new AdminPlaceService(prisma as never, {} as never, {} as never, entitlements as never),
  };
}

const draft = {
  siteId: "site-1",
  categoryId: "category-1",
  translations: [],
};

describe("AdminPlaceService place caps (integration)", () => {
  it("refuses another active place once placesMax is reached", async () => {
    const harness = placeService({ placesMax: 2, count: 2 });
    await expect(harness.service.create({ ...draft, isActive: true })).rejects.toThrow(/helykerete/);
    expect(harness.getCreated()).toBe(0);
  });

  it("skips the count query when the plan is unlimited", async () => {
    let counted = 0;
    const prisma = {
      place: {
        count: async () => {
          counted += 1;
          return 99;
        },
        create: async () => {
          throw new Error("stored");
        },
        findFirst: async () => null,
      },
    };
    const entitlements = {
      getBySiteId: async () => ({ limits: { placesMax: Number.POSITIVE_INFINITY } }),
    };
    const service = new AdminPlaceService(
      prisma as never,
      {} as never,
      {} as never,
      entitlements as never
    );
    await expect(service.create({ ...draft, isActive: true })).rejects.toThrow(/stored/);
    expect(counted).toBe(0);
  });
});

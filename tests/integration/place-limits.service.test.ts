import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AdminPlaceService } from "../../apps/api/src/admin/admin-place.service";

/**
 * Service-level integration against a mocked Prisma + entitlements (no production DB).
 * The quota itself lives in EntitlementsService; this checks the place service calls it.
 * Command: pnpm test:integration
 */
function placeService(options: { rejectWhenActive?: boolean }) {
  const calls: boolean[] = [];
  let created = 0;
  const prisma = {
    place: {
      create: async () => {
        created += 1;
        throw new Error("stored");
      },
      findFirst: async () => null,
    },
    town: { findFirst: async () => ({ id: "town-1" }) },
  };
  const entitlements = {
    assertCanAddPlace: async (_actor: string | undefined, _siteId: string, active: boolean) => {
      calls.push(active);
      if (active && options.rejectWhenActive) {
        throw new BadRequestException("A régió helykerete betelt (2/2).");
      }
    },
  };
  return {
    calls,
    getCreated: () => created,
    service: new AdminPlaceService(prisma as never, {} as never, {} as never, entitlements as never),
  };
}

const draft = {
  siteId: "site-1",
  townId: "town-1",
  categoryId: "category-1",
  translations: [],
};

describe("AdminPlaceService place caps (integration)", () => {
  it("refuses to store an active place when the region slot is full", async () => {
    const harness = placeService({ rejectWhenActive: true });
    await expect(harness.service.create({ ...draft, isActive: true }, "editor-1")).rejects.toThrow(
      /helykerete/
    );
    expect(harness.getCreated()).toBe(0);
    expect(harness.calls).toEqual([true]);
  });

  it("reaches persistence for a draft without consuming a slot", async () => {
    const harness = placeService({});
    await expect(harness.service.create({ ...draft, isActive: false }, "editor-1")).rejects.toThrow(
      /stored/
    );
    expect(harness.getCreated()).toBe(1);
    expect(harness.calls).toEqual([false]);
  });
});

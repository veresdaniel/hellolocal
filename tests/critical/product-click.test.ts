import { describe, expect, it } from "vitest";
import { AnalyticsService } from "../../apps/api/src/analytics/analytics.service";

type ClickCall = { op: string; data?: { clicks?: number | { increment: number } }; where?: unknown };

function serviceFor(product: { id: string; siteId: string; placeId: string | null } | null) {
  const calls: ClickCall[] = [];
  let existing: { id: string } | null = null;
  let createError: unknown = null;
  const prisma = {
    product: { findUnique: async () => product },
    place: {
      findFirst: async (args: { where: { id: string; siteId: string } }) => {
        calls.push({ op: "place", where: args.where });
        if (args.where.siteId === product?.siteId && args.where.id === "place-on-site") {
          return { id: "place-on-site" };
        }
        return null;
      },
    },
    productClickDaily: {
      findFirst: async () => existing,
      update: async (args: { data: ClickCall["data"] }) => {
        calls.push({ op: "update", data: args.data });
      },
      create: async (args: { data: ClickCall["data"] }) => {
        calls.push({ op: "create", data: args.data });
        if (createError) throw createError;
      },
      updateMany: async (args: { data: ClickCall["data"] }) => {
        calls.push({ op: "updateMany", data: args.data });
      },
    },
  };
  return {
    calls,
    service: new AnalyticsService(prisma as never, {} as never, {} as never),
    setExisting(row: { id: string } | null) {
      existing = row;
    },
    failCreateWith(error: unknown) {
      createError = error;
    },
  };
}

describe("product click increment", () => {
  it("adds one click to the existing daily row and ignores a client count", async () => {
    const harness = serviceFor({ id: "product-1", siteId: "site-1", placeId: "place-owned" });
    harness.setExisting({ id: "row-1" });
    const result = await harness.service.trackProductClick({
      productId: "product-1",
      placeId: "place-spoofed",
      clicks: 40,
    } as never);
    expect(result).toEqual({ ok: true });
    expect(harness.calls.map((call) => call.op)).toEqual(["update"]);
    expect(harness.calls[0]?.data).toEqual({ clicks: { increment: 1 } });
  });

  it("creates the daily row at one, and increments if the insert races", async () => {
    const fresh = serviceFor({ id: "product-1", siteId: "site-1", placeId: "place-owned" });
    await fresh.service.trackProductClick({ productId: "product-1", placeId: "place-spoofed" });
    expect(fresh.calls.find((call) => call.op === "create")?.data).toMatchObject({
      clicks: 1,
      placeId: "place-owned",
      siteId: "site-1",
    });

    const raced = serviceFor({ id: "product-1", siteId: "site-1", placeId: "place-owned" });
    raced.failCreateWith({ code: "P2002" });
    await raced.service.trackProductClick({ productId: "product-1" });
    expect(raced.calls.find((call) => call.op === "updateMany")?.data).toEqual({
      clicks: { increment: 1 },
    });
  });

  it("rejects a foreign place when the product has no place, and rejects an unknown product", async () => {
    const foreign = serviceFor({ id: "product-1", siteId: "site-1", placeId: "" });
    await expect(
      foreign.service.trackProductClick({ productId: "product-1", placeId: "place-elsewhere" })
    ).rejects.toThrow(/placeId must belong to the product site/);

    const missing = serviceFor(null);
    await expect(missing.service.trackProductClick({ productId: "missing" })).rejects.toThrow(
      /Product not found/
    );
    expect(missing.calls).toEqual([]);
  });
});

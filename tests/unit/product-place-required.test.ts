import { describe, expect, it } from "vitest";
import { ProductsService } from "../../apps/api/src/products/products.service";

function service(place: { id: string } | null) {
  let created: unknown = null;
  const prisma = {
    place: {
      findFirst: async () => place,
    },
    product: {
      create: async (args: { data: unknown }) => {
        created = args.data;
        return {
          id: "product-1",
          siteId: "site-1",
          placeId: place?.id ?? null,
          price: 0,
          currency: "HUF",
          imageUrl: null,
          category: "",
          isActive: true,
          sortOrder: 0,
          translations: [{ lang: "hu", name: "Bor", description: null }],
          place: place
            ? { id: place.id, translations: [{ lang: "hu", name: "Pince" }] }
            : null,
        };
      },
    },
  };
  return {
    getCreated: () => created,
    service: new ProductsService(prisma as never, {} as never),
  };
}

const actor = { id: "user-1", role: "superadmin" } as const;

describe("product place required (unit)", () => {
  it("rejects create without a placeId", async () => {
    const harness = service({ id: "place-1" });
    await expect(
      harness.service.create(
        "site-1",
        { placeId: "  ", translations: [{ lang: "hu", name: "Bor" }] } as never,
        actor
      )
    ).rejects.toThrow(/Place is required/);
    expect(harness.getCreated()).toBeNull();
  });

  it("rejects a place that does not belong to the site", async () => {
    const harness = service(null);
    await expect(
      harness.service.create(
        "site-1",
        { placeId: "place-elsewhere", translations: [{ lang: "hu", name: "Bor" }] },
        actor
      )
    ).rejects.toThrow(/does not belong/);
  });

  it("stores the product when the place belongs to the site", async () => {
    const harness = service({ id: "place-1" });
    const row = await harness.service.create(
      "site-1",
      { placeId: "place-1", translations: [{ lang: "hu", name: "Bor" }], price: 1200 },
      actor
    );
    expect(row).toMatchObject({ id: "product-1", placeId: "place-1" });
    expect(harness.getCreated()).toMatchObject({
      siteId: "site-1",
      placeId: "place-1",
    });
  });
});

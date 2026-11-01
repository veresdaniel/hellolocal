import { describe, expect, it } from "vitest";
import { assignMissingSlugs, fallbackSlug, generateSlug } from "../../apps/api/src/slug/slug.helper";

describe("slug helpers (unit)", () => {
  it("normalizes accents and fills missing slugs only", () => {
    expect(generateSlug("Étyek Budai")).toBe("etyek-budai");
    expect(fallbackSlug("  ", null, "boraszat")).toBe("boraszat");

    const slugs = new Map<string, string>([["place-1", "requested"]]);
    assignMissingSlugs(slugs, [
      { entityId: "place-1", slug: "hungarian" },
      { entityId: "place-2", slug: "pince" },
    ]);
    expect(slugs.get("place-1")).toBe("requested");
    expect(slugs.get("place-2")).toBe("pince");
  });
});

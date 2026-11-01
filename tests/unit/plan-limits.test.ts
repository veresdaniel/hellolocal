import { describe, expect, it } from "vitest";
import { PUBLIC_PLAN_DEFAULTS, resolvePublicPlans } from "../../apps/web/src/components/publicPlans";

describe("public plan limits (unit)", () => {
  it("keeps ordered finite caps; matrix wins, public fills gaps", () => {
    const defaults = resolvePublicPlans(null);
    expect(defaults.free.places).toBe(PUBLIC_PLAN_DEFAULTS.free.places);
    expect(defaults.free.places).toBeLessThan(defaults.basic.places);
    expect(defaults.basic.places).toBeLessThan(defaults.premium.places);

    const resolved = resolvePublicPlans({
      BASIC: { limits: { placesMax: 12, languagesMax: 2 } },
      PRO: { limits: { placesMax: Number.POSITIVE_INFINITY, languagesMax: 9 } },
      publicPlans: { premium: { places: 40, languages: 4 } },
    });
    expect(resolved.basic.places).toBe(12);
    expect(resolved.premium.places).toBe(40);
    expect(resolved.premium.languages).toBe(9);
  });
});

import { describe, expect, it } from "vitest";
import {
  sitePlanAllowsCustomDomain,
  assertSiteAllowsCustomDomain,
} from "../../apps/api/src/entitlements/assert-custom-domain-allowed";

describe("sitePlanAllowsCustomDomain", () => {
  it("blocks Basic (no feature, no aliases)", () => {
    expect(
      sitePlanAllowsCustomDomain({
        features: { customDomainEnabled: false },
        limits: { domainAliasesMax: 0 },
      })
    ).toBe(false);
  });

  it("allows Pro via domainAliasesMax even when customDomainEnabled is false", () => {
    expect(
      sitePlanAllowsCustomDomain({
        features: { customDomainEnabled: false },
        limits: { domainAliasesMax: 5 },
      })
    ).toBe(true);
  });

  it("allows Business when customDomainEnabled is true", () => {
    expect(
      sitePlanAllowsCustomDomain({
        features: { customDomainEnabled: true },
        limits: { domainAliasesMax: Infinity },
      })
    ).toBe(true);
  });

  it("assertSiteAllowsCustomDomain throws on Basic", () => {
    expect(() =>
      assertSiteAllowsCustomDomain({
        features: { customDomainEnabled: false },
        limits: { domainAliasesMax: 0 },
      })
    ).toThrow(/Basic|csomag/i);
  });
});

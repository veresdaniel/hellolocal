import { BadRequestException } from "@nestjs/common";

export type DomainPlanAllowance = {
  features: { customDomainEnabled: boolean };
  limits: { domainAliasesMax: number };
};

/**
 * Site domain gating: Basic cannot store a custom host. Pro may store hosts via
 * domainAliasesMax even while customDomainEnabled is false; Business/Municipal allow both.
 * Town/Place customDomain inherits the same parent-site entitlement (one host each).
 */
export function sitePlanAllowsCustomDomain(ent: DomainPlanAllowance): boolean {
  return Boolean(ent.features.customDomainEnabled || ent.limits.domainAliasesMax > 0);
}

export function assertSiteAllowsCustomDomain(
  ent: DomainPlanAllowance,
  message = "A Basic csomagban nem lehet saját domaint beállítani."
): void {
  if (!sitePlanAllowsCustomDomain(ent)) {
    throw new BadRequestException(message);
  }
}

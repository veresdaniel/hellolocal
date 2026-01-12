import { SetMetadata } from "@nestjs/common";
import { SiteRole as SiteRoleEnum } from "@prisma/client";
import { SITE_ROLE_KEY } from "../guards/site-role.guard";

/**
 * Decorator to specify required site role for an endpoint.
 * 
 * @example
 * @SiteRole(SiteRoleEnum.siteadmin)
 * @UseGuards(JwtAuthGuard, SiteRoleGuard)
 * @Get('site-admin-only')
 * siteAdminOnly() { ... }
 */
export const SiteRole = (...roles: SiteRoleEnum[]) => {
  return SetMetadata(SITE_ROLE_KEY, roles);
};

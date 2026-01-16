import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../guards/roles.guard";

/**
 * Decorator to specify required roles for an endpoint.
 *
 * @example
 * @Roles(UserRole.admin)
 * @Get('admin-only')
 * adminOnly() { ... }
 */
export const Roles = (...roles: UserRole[]) => {
  return SetMetadata(ROLES_KEY, roles);
};

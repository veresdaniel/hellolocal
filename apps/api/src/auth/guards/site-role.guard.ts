import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SiteRole } from "@prisma/client";
import { RbacService } from "../rbac.service";

export const SITE_ROLE_KEY = "siteRole";

/**
 * Site-level role-based access control guard.
 * Use with @SiteRole() decorator to restrict access based on site membership.
 * 
 * Requires:
 * - JwtAuthGuard to be applied first (to get user from request)
 * - siteId parameter in route or query
 * 
 * @example
 * @SiteRole(SiteRole.siteadmin)
 * @UseGuards(JwtAuthGuard, SiteRoleGuard)
 * @Get('sites/:siteId/places')
 * getPlaces(@Param('siteId') siteId: string) { ... }
 */
@Injectable()
export class SiteRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (session expired or invalid token), return 401
    if (!user) {
      throw new UnauthorizedException("Session expired or invalid token");
    }

    // Superadmin has access to everything
    if (user.role === "superadmin") {
      return true;
    }

    // Get required site role from decorator
    const requiredRoles = this.reflector.getAllAndOverride<SiteRole[]>(SITE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, allow access
    }

    // Get siteId from route params or query
    const siteId = request.params?.siteId || request.query?.siteId;

    if (!siteId) {
      throw new ForbiddenException("Site ID is required for site-level authorization");
    }

    // Check if user has required site permission
    // Use the highest required role (most permissive check)
    const highestRequiredRole = requiredRoles.reduce((highest, role) => {
      const hierarchy: Record<SiteRole, number> = {
        viewer: 1,
        editor: 2,
        siteadmin: 3,
      };
      return hierarchy[role] > hierarchy[highest] ? role : highest;
    }, requiredRoles[0]);

    const hasPermission = await this.rbacService.hasSitePermission(
      user.id,
      siteId,
      highestRequiredRole
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient site permissions. Required: ${highestRequiredRole}`
      );
    }

    return true;
  }
}

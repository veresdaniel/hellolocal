import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PlaceRole } from "@prisma/client";
import { RbacService } from "../rbac.service";

export const PLACE_ROLE_KEY = "placeRole";

/**
 * Place-level role-based access control guard.
 * Use with @PlaceRole() decorator to restrict access based on place membership.
 *
 * Requires:
 * - JwtAuthGuard to be applied first (to get user from request)
 * - placeId parameter in route or query, or in request body
 *
 * @example
 * @PlaceRole(PlaceRole.owner)
 * @UseGuards(JwtAuthGuard, PlaceRoleGuard)
 * @Put('places/:placeId')
 * updatePlace(@Param('placeId') placeId: string) { ... }
 */
@Injectable()
export class PlaceRoleGuard implements CanActivate {
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

    // Get required place role from decorator
    const requiredRoles = this.reflector.getAllAndOverride<PlaceRole[]>(PLACE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, allow access
    }

    // Get placeId from route params, query, or body
    const placeId = request.params?.placeId || request.query?.placeId || request.body?.placeId;

    if (!placeId) {
      throw new ForbiddenException("Place ID is required for place-level authorization");
    }

    // Check if user has required place permission
    // Use the highest required role (most permissive check)
    const highestRequiredRole = requiredRoles.reduce((highest, role) => {
      const hierarchy: Record<PlaceRole, number> = {
        editor: 1,
        manager: 2,
        owner: 3,
      };
      return hierarchy[role] > hierarchy[highest] ? role : highest;
    }, requiredRoles[0]);

    const hasPermission = await this.rbacService.hasPlacePermission(
      user.id,
      placeId,
      highestRequiredRole
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient place permissions. Required: ${highestRequiredRole}`
      );
    }

    return true;
  }
}

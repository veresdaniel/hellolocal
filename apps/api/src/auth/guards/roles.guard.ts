import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";

export const ROLES_KEY = "roles";

/**
 * Role-based access control guard.
 * Use with @Roles() decorator to restrict access to specific roles.
 * 
 * Example:
 * @Roles(UserRole.admin, UserRole.editor)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Superadmin has access to everything - check this FIRST
    if (user.role === UserRole.superadmin) {
      return true;
    }

    // Now check required roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, allow access
    }

    // Compare roles
    return requiredRoles.some((role) => {
      return role === user.role;
    });
  }
}


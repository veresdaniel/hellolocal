// src/auth/rbac.service.ts
import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole, SiteRole, PlaceRole } from "@prisma/client";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has site-level permission
   */
  async hasSitePermission(
    userId: string,
    siteId: string,
    requiredRole: SiteRole
  ): Promise<boolean> {
    // Check global user role first - superadmin bypasses site permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Superadmin has access to everything (global role, not site role)
    if (user.role === UserRole.superadmin) {
      return true;
    }

    // Check site membership
    const membership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId,
        },
      },
    });

    if (!membership) {
      return false;
    }

    // Check role hierarchy
    const roleHierarchy: Record<SiteRole, number> = {
      viewer: 1,
      editor: 2,
      siteadmin: 3,
    };

    const userRoleLevel = roleHierarchy[membership.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has place-level permission
   */
  async hasPlacePermission(
    userId: string,
    placeId: string,
    requiredRole: PlaceRole
  ): Promise<boolean> {
    // Check global user role first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Type assertion needed because Prisma select may narrow the type
    // The actual database value can be superadmin even if TypeScript doesn't know it
    const userRole = user.role as string;

    // Superadmin has access to everything
    if (userRole === UserRole.superadmin || userRole === "superadmin") {
      return true;
    }

    // Get place to check site
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { siteId: true },
    });

    if (!place) {
      return false;
    }

    // Check if user is siteadmin for this site
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId: place.siteId,
          userId,
        },
      },
    });

    if (siteMembership && siteMembership.role === SiteRole.siteadmin) {
      return true; // Siteadmin can manage all places in site
    }

    // Check place membership
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
    });

    if (!placeMembership) {
      return false;
    }

    // Check role hierarchy
    const roleHierarchy: Record<PlaceRole, number> = {
      editor: 1,
      manager: 2,
      owner: 3,
    };

    const userRoleLevel = roleHierarchy[placeMembership.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user can create event for a place
   * - Siteadmin: can create events for any place in site
   * - PlaceOwner/Manager: can create events for their place
   * - Others: 403
   */
  async canCreateEventForPlace(
    userId: string,
    siteId: string,
    placeId: string | null
  ): Promise<boolean> {
    // Check global user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Type assertion needed because Prisma select may narrow the type
    // The actual database value can be superadmin even if TypeScript doesn't know it
    const userRole = user.role as string;

    // Superadmin can create events anywhere
    if (userRole === UserRole.superadmin || userRole === "superadmin") {
      return true;
    }

    // Check site membership
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId,
        },
      },
    });

    // Siteadmin can create events for any place in site
    if (siteMembership && siteMembership.role === SiteRole.siteadmin) {
      return true;
    }

    // If no place specified, only siteadmin can create
    if (!placeId) {
      return false;
    }

    // Check place membership
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
    });

    if (!placeMembership) {
      return false;
    }

    // Owner and manager can create events
    return placeMembership.role === PlaceRole.owner || placeMembership.role === PlaceRole.manager;
  }

  /**
   * Get user's places (places where user has membership)
   */
  async getUserPlaces(userId: string, siteId?: string): Promise<string[]> {
    const where: any = { userId };
    if (siteId) {
      where.place = { siteId };
    }

    const memberships = await this.prisma.placeMembership.findMany({
      where,
      select: { placeId: true },
    });

    return memberships.map((m) => m.placeId);
  }

  /**
   * Assert that user has site permission (throws if not)
   */
  async assertSitePermission(
    userId: string,
    siteId: string,
    requiredRole: SiteRole
  ): Promise<void> {
    const hasPermission = await this.hasSitePermission(userId, siteId, requiredRole);
    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have ${requiredRole} permission for site ${siteId}`
      );
    }
  }

  /**
   * Assert that user has place permission (throws if not)
   */
  async assertPlacePermission(
    userId: string,
    placeId: string,
    requiredRole: PlaceRole
  ): Promise<void> {
    const hasPermission = await this.hasPlacePermission(userId, placeId, requiredRole);
    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have ${requiredRole} permission for place ${placeId}`
      );
    }
  }

  /**
   * Assert that user can create event for place (throws if not)
   */
  async assertCanCreateEventForPlace(
    userId: string,
    siteId: string,
    placeId: string | null
  ): Promise<void> {
    const canCreate = await this.canCreateEventForPlace(userId, siteId, placeId);
    if (!canCreate) {
      throw new ForbiddenException(
        `User cannot create events for place ${placeId || "in site " + siteId}`
      );
    }
  }
}

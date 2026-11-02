// src/auth/rbac.service.ts
import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, UserRole, SiteRole, PlaceRole } from "@prisma/client";
import { canEditCopy, type CopyActor, type CopyScope } from "./copy-access";

export type ContentScope = {
  unrestricted: boolean;
  /** Every region membership, including viewer. Used for reads. */
  siteIds: string[];
  /** Region admin or region editor. Site viewers are excluded. */
  regionEditorSiteIds: string[];
  /** Region admin only. May assign region memberships and delete towns. */
  regionAdminSiteIds: string[];
  townIds: string[];
  placeIds: string[];
  /** Sites of the user's places. Used so a place admin can pick a town in that region. */
  placeSiteIds: string[];
};

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
      select: { siteId: true, townId: true },
    });

    if (!place) {
      return false;
    }

    // Region admin and region editor cover every place in the region.
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId: place.siteId,
          userId,
        },
      },
    });

    if (
      siteMembership &&
      (siteMembership.role === SiteRole.siteadmin || siteMembership.role === SiteRole.editor)
    ) {
      return true;
    }

    if (place.townId) {
      const townMembership = await this.prisma.townMembership.findUnique({
        where: { townId_userId: { townId: place.townId, userId } },
      });
      if (townMembership) return true;
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

    // Region admin and region editor can create events anywhere in the region.
    if (
      siteMembership &&
      (siteMembership.role === SiteRole.siteadmin || siteMembership.role === SiteRole.editor)
    ) {
      return true;
    }

    // If no place specified, only a region role can create.
    if (!placeId) {
      return false;
    }

    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { townId: true },
    });
    if (place?.townId) {
      const townMembership = await this.prisma.townMembership.findUnique({
        where: { townId_userId: { townId: place.townId, userId } },
      });
      if (townMembership) return true;
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

    // Place members can work on events of their own places.
    return (
      placeMembership.role === PlaceRole.owner ||
      placeMembership.role === PlaceRole.manager ||
      placeMembership.role === PlaceRole.editor
    );
  }

  async getContentScope(userId: string): Promise<ContentScope> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      return {
        unrestricted: false,
        siteIds: [],
        regionEditorSiteIds: [],
        regionAdminSiteIds: [],
        townIds: [],
        placeIds: [],
        placeSiteIds: [],
      };
    }
    if (user.role === UserRole.superadmin) {
      return {
        unrestricted: true,
        siteIds: [],
        regionEditorSiteIds: [],
        regionAdminSiteIds: [],
        townIds: [],
        placeIds: [],
        placeSiteIds: [],
      };
    }
    const [sites, towns, places, legacySites] = await Promise.all([
      this.prisma.siteMembership.findMany({
        where: { userId },
        select: { siteId: true, role: true },
      }),
      this.prisma.townMembership.findMany({ where: { userId }, select: { townId: true } }),
      this.prisma.placeMembership.findMany({
        where: { userId },
        select: { placeId: true, place: { select: { siteId: true } } },
      }),
      user.role === UserRole.admin || user.role === UserRole.editor
        ? this.prisma.userSite.findMany({ where: { userId }, select: { siteId: true } })
        : Promise.resolve([]),
    ]);
    const siteIds = sites.map((row) => row.siteId);
    const regionEditorSiteIds = sites
      .filter((row) => row.role === SiteRole.siteadmin || row.role === SiteRole.editor)
      .map((row) => row.siteId);
    const narrowerScope = towns.length > 0 || places.length > 0;
    for (const row of legacySites) {
      if (!siteIds.includes(row.siteId)) siteIds.push(row.siteId);
      const explicit = sites.some((membership) => membership.siteId === row.siteId);
      if (!explicit && narrowerScope) continue;
      if (!regionEditorSiteIds.includes(row.siteId)) regionEditorSiteIds.push(row.siteId);
    }
    return {
      unrestricted: false,
      siteIds,
      regionEditorSiteIds,
      regionAdminSiteIds: sites
        .filter((row) => row.role === SiteRole.siteadmin)
        .map((row) => row.siteId),
      townIds: towns.map((row) => row.townId),
      placeIds: places.map((row) => row.placeId),
      placeSiteIds: [...new Set(places.map((row) => row.place.siteId).filter(Boolean))],
    };
  }

  canListTowns(scope: ContentScope): boolean {
    return (
      scope.unrestricted ||
      scope.regionEditorSiteIds.length > 0 ||
      scope.townIds.length > 0 ||
      scope.placeSiteIds.length > 0
    );
  }

  canListPlaces(scope: ContentScope): boolean {
    return (
      scope.unrestricted ||
      scope.regionEditorSiteIds.length > 0 ||
      scope.townIds.length > 0 ||
      scope.placeIds.length > 0
    );
  }

  /** Membership lists for a global admin: their region-admin sites, towns, and places. Not every UserSite. */
  adminMembershipPlaceWhere(scope: ContentScope): Prisma.PlaceWhereInput {
    const OR: Prisma.PlaceWhereInput[] = [];
    if (scope.regionAdminSiteIds.length) OR.push({ siteId: { in: scope.regionAdminSiteIds } });
    if (scope.townIds.length) OR.push({ townId: { in: scope.townIds } });
    if (scope.placeIds.length) OR.push({ id: { in: scope.placeIds } });
    return OR.length ? { OR } : { id: { in: [] } };
  }

  async assertReadableSite(userId: string, siteId: string) {
    if (!siteId) throw new ForbiddenException("This region is outside your access");
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return scope;
    if (scope.siteIds.includes(siteId) || scope.regionEditorSiteIds.includes(siteId)) return scope;
    if (scope.townIds.length) {
      const town = await this.prisma.town.findFirst({
        where: { id: { in: scope.townIds }, siteId },
        select: { id: true },
      });
      if (town) return scope;
    }
    if (scope.placeIds.length) {
      const place = await this.prisma.place.findFirst({
        where: { id: { in: scope.placeIds }, siteId },
        select: { id: true },
      });
      if (place) return scope;
    }
    throw new ForbiddenException("This region is outside your access");
  }

  async assertRegionEditorSite(userId: string, siteId: string) {
    if (!siteId) throw new ForbiddenException("This region is outside your access");
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return;
    if (scope.regionEditorSiteIds.includes(siteId)) return;
    throw new ForbiddenException("Only a region editor or superadmin can change this");
  }

  async defaultContentSiteId(userId: string, requested: string | undefined, fallbackSiteIds: string[]) {
    if (requested) {
      await this.assertReadableSite(userId, requested);
      return requested;
    }
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) {
      const siteId = fallbackSiteIds[0];
      if (!siteId) throw new ForbiddenException("This region is outside your access");
      return siteId;
    }
    const direct = scope.regionEditorSiteIds[0] || scope.siteIds[0];
    if (direct) return direct;
    if (scope.townIds.length) {
      const town = await this.prisma.town.findFirst({
        where: { id: { in: scope.townIds }, siteId: { not: null } },
        select: { siteId: true },
      });
      if (town?.siteId) return town.siteId;
    }
    if (scope.placeIds.length) {
      const place = await this.prisma.place.findFirst({
        where: { id: { in: scope.placeIds } },
        select: { siteId: true },
      });
      if (place?.siteId) return place.siteId;
    }
    throw new ForbiddenException("This region is outside your access");
  }

  /** Edit a town: region admin/editor or a member of that town. Not a site viewer or a place-only user. */
  async assertTownContentEditor(userId: string, townId: string) {
    const town = await this.requireTown(userId, townId);
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return town;
    if (scope.townIds.includes(town.id)) return town;
    if (town.siteId && scope.regionEditorSiteIds.includes(town.siteId)) return town;
    throw new ForbiddenException("You cannot edit this town");
  }

  /** Delete a town: superadmin or the region admin of that town. */
  async assertTownDeletable(userId: string, townId: string) {
    const town = await this.requireTown(userId, townId);
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return town;
    if (town.siteId && scope.regionAdminSiteIds.includes(town.siteId)) return town;
    throw new ForbiddenException("Only a superadmin or region admin can delete a town");
  }

  /** Edit a place or its events. Site viewers can read the region but not change it. */
  async assertPlaceContentEditor(userId: string, placeId: string) {
    const place = await this.requirePlace(userId, placeId);
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return place;
    if (scope.placeIds.includes(place.id)) return place;
    if (place.townId && scope.townIds.includes(place.townId)) return place;
    if (scope.regionEditorSiteIds.includes(place.siteId)) return place;
    throw new ForbiddenException("You cannot edit this place");
  }

  placeWhere(scope: ContentScope): Prisma.PlaceWhereInput | undefined {
    if (scope.unrestricted) return undefined;
    const OR: Prisma.PlaceWhereInput[] = [];
    if (scope.regionEditorSiteIds.length) OR.push({ siteId: { in: scope.regionEditorSiteIds } });
    if (scope.townIds.length) OR.push({ townId: { in: scope.townIds } });
    if (scope.placeIds.length) OR.push({ id: { in: scope.placeIds } });
    return OR.length ? { OR } : { id: { in: [] } };
  }

  townWhere(scope: ContentScope): Prisma.TownWhereInput | undefined {
    if (scope.unrestricted) return undefined;
    const OR: Prisma.TownWhereInput[] = [];
    if (scope.regionEditorSiteIds.length) OR.push({ siteId: { in: scope.regionEditorSiteIds } });
    if (scope.townIds.length) OR.push({ id: { in: scope.townIds } });
    if (
      scope.placeSiteIds.length > 0 &&
      scope.townIds.length === 0 &&
      scope.regionEditorSiteIds.length === 0
    ) {
      OR.push({ siteId: { in: scope.placeSiteIds } });
    }
    return OR.length ? { OR } : { id: { in: [] } };
  }

  eventWhere(scope: ContentScope): Prisma.EventWhereInput | undefined {
    if (scope.unrestricted) return undefined;
    const OR: Prisma.EventWhereInput[] = [];
    if (scope.regionEditorSiteIds.length) {
      OR.push({ place: { siteId: { in: scope.regionEditorSiteIds } } });
    }
    if (scope.townIds.length) OR.push({ place: { townId: { in: scope.townIds } } });
    if (scope.placeIds.length) OR.push({ placeId: { in: scope.placeIds } });
    return OR.length ? { OR } : { id: { in: [] } };
  }

  async requirePlace(userId: string, placeId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true, siteId: true, townId: true },
    });
    if (!place) throw new NotFoundException("Place not found");
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return place;
    const allowed =
      scope.regionEditorSiteIds.includes(place.siteId) ||
      (place.townId != null && scope.townIds.includes(place.townId)) ||
      scope.placeIds.includes(place.id);
    if (!allowed) throw new ForbiddenException("Place is outside your access");
    return place;
  }

  async requireTown(userId: string, townId: string) {
    const town = await this.prisma.town.findUnique({
      where: { id: townId },
      select: { id: true, siteId: true },
    });
    if (!town) throw new NotFoundException("Town not found");
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return town;
    const allowed =
      (town.siteId != null && scope.regionEditorSiteIds.includes(town.siteId)) ||
      scope.townIds.includes(town.id);
    if (!allowed) throw new ForbiddenException("Town is outside your access");
    return town;
  }

  async requireEvent(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, siteId: true, placeId: true, place: { select: { townId: true, siteId: true } } },
    });
    if (!event) throw new NotFoundException("Event not found");
    const scope = await this.getContentScope(userId);
    if (scope.unrestricted) return event;
    const allowed =
      scope.regionEditorSiteIds.includes(event.siteId) ||
      scope.regionEditorSiteIds.includes(event.place.siteId) ||
      (event.place.townId != null && scope.townIds.includes(event.place.townId)) ||
      scope.placeIds.includes(event.placeId);
    if (!allowed) throw new ForbiddenException("Event is outside your access");
    return event;
  }

  /**
   * Get user's places (places where user has membership)
   */
  async getUserPlaces(userId: string, siteId?: string): Promise<string[]> {
    const where: { userId: string; place?: { siteId: string } } = { userId };
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

  /**
   * Check site access with userId and allowed roles (throws if not)
   * This is the proper way to check site access in services
   */
  async checkSiteAccessWithUser(
    userId: string,
    siteId: string,
    allowedRoles: SiteRole[]
  ): Promise<void> {
    // Check if user has any of the allowed roles
    for (const role of allowedRoles) {
      const hasPermission = await this.hasSitePermission(userId, siteId, role);
      if (hasPermission) {
        return; // User has at least one of the required roles
      }
    }

    // User doesn't have any of the required roles
    throw new ForbiddenException(
      `User does not have required site permission. Required: ${allowedRoles.join(" or ")}`
    );
  }

  /**
   * Global role plus membership on one site and optionally one place.
   * A missing site id is only valid for platform copy, which ignores site/place role.
   */
  async copyActor(
    userId: string,
    role: string | null | undefined,
    siteId?: string,
    placeId?: string
  ): Promise<CopyActor> {
    let resolved = role;
    if (!resolved) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      resolved = user?.role ?? null;
    }
    if (resolved === UserRole.superadmin) {
      return { role: resolved, siteRole: null, placeRole: null };
    }
    let siteRole: string | null = null;
    if (siteId) {
      const membership = await this.prisma.siteMembership.findUnique({
        where: { siteId_userId: { siteId, userId } },
        select: { role: true },
      });
      siteRole = membership?.role ?? null;
    }
    let placeRole: string | null = null;
    if (placeId) {
      const membership = await this.prisma.placeMembership.findUnique({
        where: { placeId_userId: { placeId, userId } },
        select: { role: true },
      });
      placeRole = membership?.role ?? null;
    }
    return { role: resolved, siteRole, placeRole };
  }

  assertCopyEditor(actor: CopyActor, scope: CopyScope): void {
    if (canEditCopy(actor, scope)) return;
    throw new ForbiddenException(
      scope === "platform"
        ? "Only a superadmin can edit platform UI copy"
        : "Only the site owner or a superadmin can edit these translations"
    );
  }
}

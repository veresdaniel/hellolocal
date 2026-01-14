// src/admin/admin-place-membership.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlaceRole, UserRole, SiteRole } from "@prisma/client";
import { RbacService } from "../auth/rbac.service";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

export interface CreatePlaceMembershipDto {
  placeId: string;
  userId: string;
  role: PlaceRole;
}

export interface UpdatePlaceMembershipDto {
  role?: PlaceRole;
}

@Injectable()
export class AdminPlaceMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService
  ) {}

  async findAll(placeId?: string, userId?: string) {
    const where: any = {};
    if (placeId) where.placeId = placeId;
    if (userId) where.userId = userId;

    return this.prisma.placeMembership.findMany({
      where,
      include: {
        place: {
          select: {
            id: true,
            translations: {
              select: {
                lang: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const membership = await this.prisma.placeMembership.findUnique({
      where: { id },
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(`PlaceMembership with ID ${id} not found`);
    }

    return membership;
  }

  async create(dto: CreatePlaceMembershipDto, actorUserId: string) {
    // Check if place exists
    const place = await this.prisma.place.findUnique({
      where: { id: dto.placeId },
      include: { site: true },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${dto.placeId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check if membership already exists
    const existing = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId: dto.placeId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `PlaceMembership already exists for place ${dto.placeId} and user ${dto.userId}`
      );
    }

    // RBAC: Check if actor can assign this role
    await this.checkCanAssignRole(actorUserId, dto.placeId, place.siteId, dto.role, null);

    return this.prisma.placeMembership.create({
      data: {
        placeId: dto.placeId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        user: true,
      },
    });
  }

  async update(id: string, dto: UpdatePlaceMembershipDto, actorUserId: string) {
    const membership = await this.findOne(id);
    
    // Get place with site for RBAC check
    const place = await this.prisma.place.findUnique({
      where: { id: membership.placeId },
      include: { site: true },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${membership.placeId} not found`);
    }

    // RBAC: Check if actor can assign this role
    if (dto.role !== undefined) {
      await this.checkCanAssignRole(actorUserId, membership.placeId, place.siteId, dto.role, membership.role);
    }

    const updateData: any = {};
    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }

    return this.prisma.placeMembership.update({
      where: { id },
      data: updateData,
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        user: true,
      },
    });
  }

  async delete(id: string, actorUserId: string) {
    const membership = await this.findOne(id);
    
    // Get place with site for RBAC check
    const place = await this.prisma.place.findUnique({
      where: { id: membership.placeId },
      include: { site: true },
    });

    if (!place) {
      throw new NotFoundException(`Place with ID ${membership.placeId} not found`);
    }

    // RBAC: Check if actor can delete this membership
    await this.checkCanDeleteMembership(actorUserId, membership.placeId, place.siteId, membership.role);

    return this.prisma.placeMembership.delete({
      where: { id },
    });
  }

  /**
   * Check if actor can assign a role to a place membership
   * Rules:
   * - Owner can assign any role
   * - Manager can assign manager/editor, but NOT owner
   * - Editor cannot assign any role
   * - Siteadmin/superadmin can assign any role
   */
  private async checkCanAssignRole(
    actorUserId: string,
    placeId: string,
    siteId: string,
    targetRole: PlaceRole,
    currentRole: PlaceRole | null
  ): Promise<void> {
    // Check global user role
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });

    if (!actor) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_ACTOR_NOT_FOUND);
    }

    // Superadmin and siteadmin can assign any role
    if (actor.role === UserRole.superadmin) {
      return;
    }

    // Check site membership
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId: actorUserId,
        },
      },
    });

    if (siteMembership?.role === SiteRole.siteadmin) {
      return; // Siteadmin can assign any role
    }

    // Check place membership
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId: actorUserId,
        },
      },
    });

    if (!placeMembership) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_ACTOR_NO_PERMISSION_MANAGE_MEMBERSHIPS);
    }

    // Owner can assign any role
    if (placeMembership.role === PlaceRole.owner) {
      return;
    }

    // Manager can assign manager/editor, but NOT owner
    if (placeMembership.role === PlaceRole.manager) {
      if (targetRole === PlaceRole.owner) {
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_MANAGER_CANNOT_ASSIGN_OWNER);
      }
      // Also check if trying to modify an existing owner
      if (currentRole === PlaceRole.owner) {
        throw new ForbiddenException("Manager cannot modify owner role");
      }
      return;
    }

    // Editor cannot assign any role
    throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_EDITOR_CANNOT_MANAGE_MEMBERSHIPS);
  }

  /**
   * Check if actor can delete a place membership
   * Rules:
   * - Owner can delete any membership
   * - Manager can delete manager/editor, but NOT owner
   * - Editor cannot delete any membership
   * - Siteadmin/superadmin can delete any membership
   */
  private async checkCanDeleteMembership(
    actorUserId: string,
    placeId: string,
    siteId: string,
    targetRole: PlaceRole
  ): Promise<void> {
    // Check global user role
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true },
    });

    if (!actor) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_ACTOR_NOT_FOUND);
    }

    // Superadmin and siteadmin can delete any membership
    if (actor.role === UserRole.superadmin) {
      return;
    }

    // Check site membership
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId: actorUserId,
        },
      },
    });

    if (siteMembership?.role === SiteRole.siteadmin) {
      return; // Siteadmin can delete any membership
    }

    // Check place membership
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId: actorUserId,
        },
      },
    });

    if (!placeMembership) {
      throw new ForbiddenException("Actor does not have permission to delete place memberships");
    }

    // Owner can delete any membership
    if (placeMembership.role === PlaceRole.owner) {
      return;
    }

    // Manager can delete manager/editor, but NOT owner
    if (placeMembership.role === PlaceRole.manager) {
      if (targetRole === PlaceRole.owner) {
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_MANAGER_CANNOT_DELETE_OWNER);
      }
      return;
    }

    // Editor cannot delete any membership
    throw new ForbiddenException("Editor cannot delete place memberships");
  }

  /**
   * Get places where user has membership
   */
  async getMyPlaces(userId: string, siteId?: string) {
    const where: any = {
      userId,
    };

    if (siteId) {
      where.place = {
        siteId,
      };
    }

    const memberships = await this.prisma.placeMembership.findMany({
      where,
      include: {
        place: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
              },
            },
            translations: true,
            category: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => m.place);
  }
}

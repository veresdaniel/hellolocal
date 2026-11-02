import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

export interface UpdateUserRoleDto {
  role: UserRole;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  role?: UserRole;
  siteIds?: string[];
  isActive?: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  bio?: string;
  isActive?: boolean;
  siteIds?: string[];
  /** Opt-in floating AI Assistant; users may toggle for themselves. */
  aiAssistantEnabled?: boolean;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string) {
    const where: { sites?: { some: { siteId: string } } } = {};
    if (siteId) {
      where.sites = {
        some: {
          siteId,
        },
      };
    }

    return this.prisma.user.findMany({
      where,
      include: {
        sites: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: {
                  select: {
                    lang: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        sites: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: {
                  select: {
                    lang: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_USER);
    }

    return user;
  }

  async updateRole(userId: string, newRole: UserRole, currentUserRole: UserRole) {
    // Only superadmin can change roles
    if (currentUserRole !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can change user roles");
    }

    // Prevent changing superadmin role (except by another superadmin)
    const user = await this.findOne(userId);
    if (user.role === UserRole.superadmin && newRole !== UserRole.superadmin) {
      throw new BadRequestException("Cannot change superadmin role");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
        // New superadmins get AI Assistant on; demotion leaves the flag as-is.
        ...(newRole === UserRole.superadmin ? { aiAssistantEnabled: true } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        aiAssistantEnabled: true,
      },
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const data: UpdateUserDto = { ...dto };
    // Never allow mass-assigning siteIds through prisma data object.
    const { siteIds: _siteIds, ...userFields } = data;
    void _siteIds;
    return this.prisma.user.update({
      where: { id: userId },
      data: userFields,
      include: {
        sites: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: {
                  select: {
                    lang: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.findOne(userId);
    // Add siteIds array for frontend compatibility
    const siteIds = user.sites.map((s) => s.siteId);
    return {
      ...user,
      siteIds,
      activeSiteId: user.activeSiteId || null,
    };
  }

  async getAllSites() {
    return this.prisma.site.findMany({
      include: {
        translations: {
          select: {
            lang: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(dto: CreateUserDto, currentUserRole: UserRole) {
    // Only superadmin can create users
    if (currentUserRole !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can create users");
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("User with this email or username already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user (as visitor - activeSiteId is null by default)
    // User will become active when they activate a site
    const role = dto.role || UserRole.viewer;
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        role,
        isActive: dto.isActive ?? true,
        // Superadmins get AI Assistant enabled by default; everyone else stays off.
        aiAssistantEnabled: role === UserRole.superadmin,
        activeSiteId: null, // Visitor by default
        sites: dto.siteIds
          ? {
              create: dto.siteIds.map((siteId, index) => ({
                siteId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        sites: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: {
                  select: {
                    lang: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return user;
  }

  async remove(id: string, currentUserRole: UserRole) {
    if (currentUserRole !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can delete users");
    }
    const user = await this.findOne(id);
    if (user.role === UserRole.superadmin) {
      throw new BadRequestException("Cannot delete a superadmin user");
    }
    await this.prisma.user.delete({ where: { id } });
    return { message: "User deleted successfully" };
  }

  async updateUserWithSites(
    userId: string,
    dto: UpdateUserDto,
    currentUserRole: UserRole,
    options?: { isSelf?: boolean }
  ) {
    const isAdmin =
      currentUserRole === UserRole.superadmin || currentUserRole === UserRole.admin;
    const isSelf = Boolean(options?.isSelf);

    // Non-admins may only update their own safe profile fields (incl. AI Assistant opt-in).
    if (!isAdmin && !isSelf) {
      throw new ForbiddenException("Only superadmin or admin can update users");
    }

    if (!isAdmin && isSelf) {
      const allowedSelfKeys = ["firstName", "lastName", "bio", "aiAssistantEnabled"] as const;
      const disallowed = Object.keys(dto).filter(
        (key) => !allowedSelfKeys.includes(key as (typeof allowedSelfKeys)[number])
      );
      if (disallowed.length > 0) {
        throw new ForbiddenException("You can only update your own profile fields");
      }
      if (dto.siteIds !== undefined || dto.isActive !== undefined) {
        throw new ForbiddenException("You cannot change site memberships or active state");
      }
    }

    const updateData: Partial<UpdateUserDto> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.isActive !== undefined && isAdmin) updateData.isActive = dto.isActive;
    if (dto.aiAssistantEnabled !== undefined) {
      updateData.aiAssistantEnabled = dto.aiAssistantEnabled;
    }

    // Update site relationships if provided (admin only)
    if (dto.siteIds !== undefined && isAdmin) {
      await this.prisma.userSite.deleteMany({
        where: { userId },
      });

      if (dto.siteIds.length > 0) {
        await this.prisma.userSite.createMany({
          data: dto.siteIds.map((siteId, index) => ({
            userId,
            siteId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    return this.updateUser(userId, updateData);
  }
}

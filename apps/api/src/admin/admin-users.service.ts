import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string) {
    const where: any = {};
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
      throw new NotFoundException("User not found");
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
      data: { role: newRole },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
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
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        role: dto.role || UserRole.viewer,
        isActive: dto.isActive ?? true,
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

  async updateUserWithSites(userId: string, dto: UpdateUserDto, currentUserRole: UserRole) {
    // Only superadmin or admin can update other users
    if (currentUserRole !== UserRole.superadmin && currentUserRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin or admin can update users");
    }

    const updateData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      bio: dto.bio,
      isActive: dto.isActive,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update site relationships if provided
    if (dto.siteIds !== undefined) {
      // Delete existing site relationships
      await this.prisma.userSite.deleteMany({
        where: { userId },
      });

      // Create new site relationships
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


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
  tenantIds?: string[];
  isActive?: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  bio?: string;
  isActive?: boolean;
  tenantIds?: string[];
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenants = {
        some: {
          tenantId,
        },
      };
    }

    return this.prisma.user.findMany({
      where,
      include: {
        tenants: {
          include: {
            tenant: {
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
        tenants: {
          include: {
            tenant: {
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
        tenants: {
          include: {
            tenant: {
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
    return this.findOne(userId);
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany({
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

    // Create user
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
        tenants: dto.tenantIds
          ? {
              create: dto.tenantIds.map((tenantId, index) => ({
                tenantId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        tenants: {
          include: {
            tenant: {
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

  async updateUserWithTenants(userId: string, dto: UpdateUserDto, currentUserRole: UserRole) {
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

    // Update tenant relationships if provided
    if (dto.tenantIds !== undefined) {
      // Delete existing tenant relationships
      await this.prisma.userTenant.deleteMany({
        where: { userId },
      });

      // Create new tenant relationships
      if (dto.tenantIds.length > 0) {
        await this.prisma.userTenant.createMany({
          data: dto.tenantIds.map((tenantId, index) => ({
            userId,
            tenantId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    return this.updateUser(userId, updateData);
  }
}


// src/admin/admin-site-membership.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteRole } from "@prisma/client";

export interface CreateSiteMembershipDto {
  siteId: string;
  userId: string;
  role: SiteRole;
}

export interface UpdateSiteMembershipDto {
  role?: SiteRole;
}

@Injectable()
export class AdminSiteMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string, userId?: string) {
    const where: any = {};
    if (siteId) where.siteId = siteId;
    if (userId) where.userId = userId;

    return this.prisma.siteMembership.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            slug: true,
            isActive: true,
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
    const membership = await this.prisma.siteMembership.findUnique({
      where: { id },
      include: {
        site: true,
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(`SiteMembership with ID ${id} not found`);
    }

    return membership;
  }

  async create(dto: CreateSiteMembershipDto) {
    // Check if site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check if membership already exists
    const existing = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId: dto.siteId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `SiteMembership already exists for site ${dto.siteId} and user ${dto.userId}`
      );
    }

    return this.prisma.siteMembership.create({
      data: {
        siteId: dto.siteId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        site: true,
        user: true,
      },
    });
  }

  async update(id: string, dto: UpdateSiteMembershipDto) {
    await this.findOne(id);

    const updateData: any = {};
    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }

    return this.prisma.siteMembership.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        user: true,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.siteMembership.delete({
      where: { id },
    });
  }
}

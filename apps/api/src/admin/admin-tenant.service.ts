import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateTenantDto {
  slug: string;
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
}

export interface UpdateTenantDto {
  slug?: string;
  translations?: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
}

@Injectable()
export class AdminTenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.tenant.findMany({
        include: {
          translations: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error in AdminTenantService.findAll:", error);
      throw error;
    }
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        translations: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return tenant;
  }

  async create(dto: CreateTenantDto) {
    // Check if slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new BadRequestException(`Tenant with slug "${dto.slug}" already exists`);
    }

    return this.prisma.tenant.create({
      data: {
        slug: dto.slug,
        isActive: dto.isActive ?? true,
        primaryDomain: dto.primaryDomain ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            shortDescription: t.shortDescription ?? null,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      include: {
        translations: true,
      },
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);

    // Check if slug is being changed and if new slug already exists
    if (dto.slug && dto.slug !== tenant.slug) {
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });

      if (existingTenant) {
        throw new BadRequestException(`Tenant with slug "${dto.slug}" already exists`);
      }
    }

    const updateData: any = {};
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.primaryDomain !== undefined) updateData.primaryDomain = dto.primaryDomain;

    await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.tenantTranslation.upsert({
          where: {
            tenantId_lang: {
              tenantId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            tenantId: id,
            lang: translation.lang,
            name: translation.name,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);

    // Check if tenant is used by any users
    // Query users that have this tenant assigned
    const usersWithTenant = await (this.prisma as any).user.findMany({
      where: {
        tenants: {
          some: {
            tenantId: id,
          },
        },
      },
      select: { id: true },
    });
    const usersCount = usersWithTenant.length;

    if (usersCount > 0) {
      throw new BadRequestException(
        `Cannot delete tenant: it is used by ${usersCount} user(s). Deactivate it instead.`
      );
    }

    await this.prisma.tenant.delete({
      where: { id },
    });

    return { message: "Tenant deleted successfully" };
  }
}


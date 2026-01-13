// src/admin/admin-site-instance.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateSiteInstanceDto {
  siteId: string;
  lang: Lang;
  isDefault?: boolean;
  mapConfig?: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  features?: {
    enableEvents?: boolean;
    enableBlog?: boolean;
    enableStaticPages?: boolean;
    [key: string]: any;
  } | null;
  sitePlaceholders?: {
    card?: string | null;
    hero?: string | null;
    eventCard?: string | null;
    [key: string]: any;
  } | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export interface UpdateSiteInstanceDto {
  lang?: Lang;
  isDefault?: boolean;
  mapConfig?: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  features?: {
    enableEvents?: boolean;
    enableBlog?: boolean;
    enableStaticPages?: boolean;
    [key: string]: any;
  } | null;
  sitePlaceholders?: {
    card?: string | null;
    hero?: string | null;
    eventCard?: string | null;
    [key: string]: any;
  } | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

@Injectable()
export class AdminSiteInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string) {
    const where = siteId ? { siteId } : {};
    return this.prisma.siteInstance.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            slug: true,
            isActive: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { siteId: "asc" },
        { lang: "asc" },
      ],
    });
  }

  async findOne(id: string) {
    const siteInstance = await this.prisma.siteInstance.findUnique({
      where: { id },
      include: {
        site: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!siteInstance) {
      throw new NotFoundException(`SiteInstance with ID ${id} not found`);
    }

    return siteInstance;
  }

  async findBySiteAndLang(siteId: string, lang: Lang) {
    return this.prisma.siteInstance.findUnique({
      where: {
        siteId_lang: {
          siteId,
          lang,
        },
      },
      include: {
        site: {
          include: {
            brand: true,
          },
        },
      },
    });
  }

  async create(dto: CreateSiteInstanceDto) {
    // Check if site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} not found`);
    }

    // Check if site instance already exists for this site+lang combination
    const existing = await this.prisma.siteInstance.findUnique({
      where: {
        siteId_lang: {
          siteId: dto.siteId,
          lang: dto.lang,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `SiteInstance already exists for site ${dto.siteId} with language ${dto.lang}`
      );
    }

    // If this is set as default, unset other defaults for this site
    if (dto.isDefault) {
      await this.prisma.siteInstance.updateMany({
        where: {
          siteId: dto.siteId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.siteInstance.create({
      data: {
        siteId: dto.siteId,
        lang: dto.lang,
        isDefault: dto.isDefault ?? false,
        mapConfig: dto.mapConfig || undefined,
        features: dto.features || undefined,
        sitePlaceholders: dto.sitePlaceholders || undefined,
        logoUrl: dto.logoUrl || undefined,
        faviconUrl: dto.faviconUrl || undefined,
      },
      include: {
        site: {
          include: {
            brand: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateSiteInstanceDto) {
    const siteInstance = await this.findOne(id);

    // If changing lang, check for conflicts
    if (dto.lang && dto.lang !== siteInstance.lang) {
      const existing = await this.prisma.siteInstance.findUnique({
        where: {
          siteId_lang: {
            siteId: siteInstance.siteId,
            lang: dto.lang,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `SiteInstance already exists for site ${siteInstance.siteId} with language ${dto.lang}`
        );
      }
    }

    // If setting as default, unset other defaults for this site
    if (dto.isDefault === true) {
      await this.prisma.siteInstance.updateMany({
        where: {
          siteId: siteInstance.siteId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updateData: any = {};

    if (dto.lang !== undefined) {
      updateData.lang = dto.lang;
    }

    if (dto.isDefault !== undefined) {
      updateData.isDefault = dto.isDefault;
    }

    if (dto.mapConfig !== undefined) {
      updateData.mapConfig = dto.mapConfig;
    }

    if (dto.features !== undefined) {
      updateData.features = dto.features;
    }

    if (dto.sitePlaceholders !== undefined) {
      updateData.sitePlaceholders = dto.sitePlaceholders;
    }

    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl;
    }

    if (dto.faviconUrl !== undefined) {
      updateData.faviconUrl = dto.faviconUrl;
    }

    return this.prisma.siteInstance.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          include: {
            brand: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    // Check if site instance exists
    await this.findOne(id);

    return this.prisma.siteInstance.delete({
      where: { id },
    });
  }
}

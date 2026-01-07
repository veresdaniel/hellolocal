import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreatePlaceDto {
  tenantId: string;
  townId?: string | null;
  categoryId: string;
  priceBandId?: string | null;
  tagIds?: string[];
  ownerId?: string | null;
  translations: Array<{
    lang: Lang;
    name: string;
    teaser?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    openingHours?: string | null;
    accessibility?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  extras?: any;
}

export interface UpdatePlaceDto {
  townId?: string | null;
  categoryId?: string;
  priceBandId?: string | null;
  tagIds?: string[];
  ownerId?: string | null;
  translations?: Array<{
    lang: Lang;
    name: string;
    teaser?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    openingHours?: string | null;
    accessibility?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  extras?: any;
}

@Injectable()
export class AdminPlaceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.place.findMany({
      where: { tenantId },
      include: {
        category: {
          include: {
            translations: true,
          },
        },
        priceBand: {
          include: {
            translations: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: true,
              },
            },
          },
        },
        town: {
          include: {
            translations: true,
          },
        },
        translations: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId },
      include: {
        category: {
          include: {
            translations: true,
          },
        },
        priceBand: {
          include: {
            translations: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: true,
              },
            },
          },
        },
        town: {
          include: {
            translations: true,
          },
        },
        translations: true,
      },
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    return place;
  }

  async create(dto: CreatePlaceDto) {
    const { tagIds = [], translations, ...placeData } = dto;

    const place = await this.prisma.place.create({
      data: {
        ...placeData,
        isActive: dto.isActive ?? true,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            teaser: t.teaser ?? null,
            description: t.description ?? null,
            address: t.address ?? null,
            phone: t.phone ?? null,
            email: t.email ?? null,
            website: t.website ?? null,
            openingHours: t.openingHours ?? null,
            accessibility: t.accessibility ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
      include: {
        category: {
          include: {
            translations: true,
          },
        },
        priceBand: {
          include: {
            translations: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: true,
              },
            },
          },
        },
        town: {
          include: {
            translations: true,
          },
        },
        translations: true,
      },
    });

    return place;
  }

  async update(id: string, tenantId: string, dto: UpdatePlaceDto) {
    const place = await this.findOne(id, tenantId);

    const { tagIds, translations, ...updateData } = dto;

    await this.prisma.place.update({
      where: { id },
      data: updateData,
    });

    if (tagIds !== undefined) {
      await this.prisma.placeTag.deleteMany({
        where: { placeId: id },
      });
      if (tagIds.length > 0) {
        await this.prisma.placeTag.createMany({
          data: tagIds.map((tagId) => ({
            placeId: id,
            tagId,
          })),
        });
      }
    }

    if (translations) {
      for (const translation of translations) {
        await this.prisma.placeTranslation.upsert({
          where: {
            placeId_lang: {
              placeId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            teaser: translation.teaser ?? null,
            description: translation.description ?? null,
            address: translation.address ?? null,
            phone: translation.phone ?? null,
            email: translation.email ?? null,
            website: translation.website ?? null,
            openingHours: translation.openingHours ?? null,
            accessibility: translation.accessibility ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            placeId: id,
            lang: translation.lang,
            name: translation.name,
            teaser: translation.teaser ?? null,
            description: translation.description ?? null,
            address: translation.address ?? null,
            phone: translation.phone ?? null,
            email: translation.email ?? null,
            website: translation.website ?? null,
            openingHours: translation.openingHours ?? null,
            accessibility: translation.accessibility ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
        });
      }
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    await this.prisma.place.delete({
      where: { id },
    });

    return { message: "Place deleted successfully" };
  }
}


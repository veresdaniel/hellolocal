import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateTownDto {
  siteId: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
}

export interface UpdateTownDto {
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
}

@Injectable()
export class AdminTownService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string, page?: number, limit?: number) {
    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 10;
    
    const where = { siteId };
    
    // Get total count
    const total = await this.prisma.town.count({ where });
    
    // Get paginated results
    const towns = await this.prisma.town.findMany({
      where,
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    
    // Always return paginated response
    return {
      towns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(id: string, siteId: string) {
    const town = await this.prisma.town.findFirst({
      where: { id, siteId },
      include: {
        translations: true,
      },
    });

    if (!town) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_TOWN);
    }

    return town;
  }

  async create(dto: CreateTownDto) {
    return this.prisma.town.create({
      data: {
        siteId: dto.siteId,
        isActive: dto.isActive ?? true,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
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

  async update(id: string, siteId: string, dto: UpdateTownDto) {
    const town = await this.findOne(id, siteId);

    const updateData: any = {};
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }
    if (dto.lat !== undefined) {
      updateData.lat = dto.lat;
    }
    if (dto.lng !== undefined) {
      updateData.lng = dto.lng;
    }

    await this.prisma.town.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.townTranslation.upsert({
          where: {
            townId_lang: {
              townId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            townId: id,
            lang: translation.lang,
            name: translation.name,
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

    return this.findOne(id, siteId);
  }

  async remove(id: string, siteId: string) {
    const town = await this.findOne(id, siteId);

    // Check if town is used by any places
    const placesCount = await this.prisma.place.count({
      where: { townId: id },
    });

    if (placesCount > 0) {
      throw new BadRequestException(
        `Cannot delete town: it is used by ${placesCount} place(s). Deactivate it instead.`
      );
    }

    await this.prisma.town.delete({
      where: { id },
    });

    return { message: "Town deleted successfully" };
  }
}


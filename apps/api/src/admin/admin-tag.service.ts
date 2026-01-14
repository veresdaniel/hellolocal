import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateTagDto {
  siteId: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

export interface UpdateTagDto {
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

@Injectable()
export class AdminTagService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string, page?: number, limit?: number) {
    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 50;
    
    const where = { siteId };
    
    // Get total count
    const total = await this.prisma.tag.count({ where });
    
    // Get paginated results
    const tags = await this.prisma.tag.findMany({
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
      tags,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(id: string, siteId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, siteId },
      include: {
        translations: true,
      },
    });

    if (!tag) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_TAG);
    }

    return tag;
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        siteId: dto.siteId,
        isActive: dto.isActive ?? true,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
          })),
        },
      },
      include: {
        translations: true,
      },
    });
  }

  async update(id: string, siteId: string, dto: UpdateTagDto) {
    const tag = await this.findOne(id, siteId);

    const updateData: any = {};
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.tag.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.tagTranslation.upsert({
          where: {
            tagId_lang: {
              tagId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            description: translation.description ?? null,
          },
          create: {
            tagId: id,
            lang: translation.lang,
            name: translation.name,
            description: translation.description ?? null,
          },
        });
      }
    }

    return this.findOne(id, siteId);
  }

  async remove(id: string, siteId: string) {
    const tag = await this.findOne(id, siteId);

    // Check if tag is used by any places
    const placesCount = await this.prisma.placeTag.count({
      where: { tagId: id },
    });

    if (placesCount > 0) {
      throw new BadRequestException(
        `Cannot delete tag: it is used by ${placesCount} place(s). Deactivate it instead.`
      );
    }

    await this.prisma.tag.delete({
      where: { id },
    });

    return { message: "Tag deleted successfully" };
  }
}


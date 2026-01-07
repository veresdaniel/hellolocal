import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateTagDto {
  tenantId: string;
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

  async findAll(tenantId: string) {
    return this.prisma.tag.findMany({
      where: { tenantId },
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, tenantId },
      include: {
        translations: true,
      },
    });

    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    return tag;
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        tenantId: dto.tenantId,
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

  async update(id: string, tenantId: string, dto: UpdateTagDto) {
    const tag = await this.findOne(id, tenantId);

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

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const tag = await this.findOne(id, tenantId);

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


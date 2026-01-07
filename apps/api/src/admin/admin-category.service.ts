import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateCategoryDto {
  tenantId: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

@Injectable()
export class AdminCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        translations: true,
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
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

  async update(id: string, tenantId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id, tenantId);

    const updateData: any = {};
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.category.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.categoryTranslation.upsert({
          where: {
            categoryId_lang: {
              categoryId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            description: translation.description ?? null,
          },
          create: {
            categoryId: id,
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
    const category = await this.findOne(id, tenantId);

    // Check if category is used by any places
    const placesCount = await this.prisma.place.count({
      where: { categoryId: id },
    });

    if (placesCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: it is used by ${placesCount} place(s). Deactivate it instead.`
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: "Category deleted successfully" };
  }
}


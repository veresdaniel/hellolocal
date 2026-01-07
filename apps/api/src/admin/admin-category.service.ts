import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreateCategoryDto {
  tenantId: string;
  parentId?: string | null;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
  color?: string | null;
  order?: number;
}

export interface UpdateCategoryDto {
  parentId?: string | null;
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
  color?: string | null;
  order?: number;
}

@Injectable()
export class AdminCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: {
        translations: true,
        parent: {
          include: {
            translations: true,
          },
        },
      },
      orderBy: [
        { parentId: "asc" }, // Root categories first (null values)
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        translations: true,
        parent: {
          include: {
            translations: true,
          },
        },
        children: {
          include: {
            translations: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId: dto.tenantId },
      });
      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }
      // Prevent circular reference: check if parent is not a child of this category
      // (This check is not needed for create, but we validate parent exists)
    }

    // Get max order for the parent level (or root if no parent)
    const maxOrder = await this.prisma.category.findFirst({
      where: {
        tenantId: dto.tenantId,
        parentId: dto.parentId || null,
      },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = dto.order !== undefined ? dto.order : (maxOrder?.order ?? -1) + 1;

    return this.prisma.category.create({
      data: {
        tenantId: dto.tenantId,
        parentId: dto.parentId || null,
        isActive: dto.isActive ?? true,
        color: dto.color ?? null,
        order: newOrder,
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
        parent: {
          include: {
            translations: true,
          },
        },
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id, tenantId);

    // Prevent setting self as parent (circular reference)
    if (dto.parentId === id) {
      throw new BadRequestException("Category cannot be its own parent");
    }

    // Validate parent if provided
    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        const parent = await this.prisma.category.findFirst({
          where: { id: dto.parentId, tenantId },
        });
        if (!parent) {
          throw new BadRequestException("Parent category not found");
        }
        // Prevent circular reference: check if parent is a descendant of this category
        let currentParentId = parent.parentId;
        while (currentParentId) {
          if (currentParentId === id) {
            throw new BadRequestException("Cannot set parent: would create circular reference");
          }
          const currentParent = await this.prisma.category.findFirst({
            where: { id: currentParentId, tenantId },
            select: { parentId: true },
          });
          currentParentId = currentParent?.parentId || null;
        }
      }
    }

    const updateData: any = {};
    if (dto.parentId !== undefined) {
      updateData.parentId = dto.parentId || null;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }
    if (dto.color !== undefined) {
      updateData.color = dto.color;
    }
    if (dto.order !== undefined) {
      updateData.order = dto.order;
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

  async reorder(tenantId: string, updates: Array<{ id: string; parentId: string | null; order: number }>) {
    // Validate all categories belong to the tenant
    const categoryIds = updates.map((u) => u.id);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, tenantId },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException("Some categories not found or don't belong to tenant");
    }

    // Validate parent categories
    const parentIds = updates.filter((u) => u.parentId).map((u) => u.parentId!);
    if (parentIds.length > 0) {
      const parents = await this.prisma.category.findMany({
        where: { id: { in: parentIds }, tenantId },
        select: { id: true },
      });
      if (parents.length !== parentIds.length) {
        throw new BadRequestException("Some parent categories not found or don't belong to tenant");
      }
    }

    // Prevent circular references
    for (const update of updates) {
      if (update.parentId) {
        // Check if parent is in the updates and would create a cycle
        const parentUpdate = updates.find((u) => u.id === update.parentId);
        if (parentUpdate && parentUpdate.parentId === update.id) {
          throw new BadRequestException("Circular reference detected");
        }
      }
    }

    // Update all categories in a transaction
    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.category.update({
          where: { id: update.id },
          data: {
            parentId: update.parentId,
            order: update.order,
          },
        })
      )
    );

    return { message: "Categories reordered successfully" };
  }
}


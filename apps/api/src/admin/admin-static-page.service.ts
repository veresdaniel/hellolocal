import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

const ALLOWED_CATEGORIES = new Set(["blog", "tudastar", "infok"] as const);
type StaticPageCategory = "blog" | "tudastar" | "infok";

export interface CreateStaticPageDto {
  siteId: string;
  category: StaticPageCategory;
  translations: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null; // HTML - for list view cards
    content?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
}

export interface UpdateStaticPageDto {
  category?: StaticPageCategory;
  translations?: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null; // HTML - for list view cards
    content?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
}

@Injectable()
export class AdminStaticPageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string, category?: StaticPageCategory, page?: number, limit?: number) {
    const where: any = { siteId };
    if (category) {
      if (!ALLOWED_CATEGORIES.has(category)) {
        throw new BadRequestException(`Invalid category: ${category}. Must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
      }
      where.category = category;
    }

    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 50;
    
    // Get total count
    const total = await this.prisma.staticPage.count({ where });
    
    // Get paginated results
    const staticPages = await this.prisma.staticPage.findMany({
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
      staticPages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(id: string, siteId: string) {
    const staticPage = await this.prisma.staticPage.findFirst({
      where: { id, siteId },
      include: {
        translations: true,
      },
    });

    if (!staticPage) {
      throw new NotFoundException("Static page not found");
    }

    return staticPage;
  }

  async create(dto: CreateStaticPageDto) {
    if (!ALLOWED_CATEGORIES.has(dto.category)) {
      throw new BadRequestException(`Invalid category: ${dto.category}. Must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
    }

    return this.prisma.staticPage.create({
      data: {
        siteId: dto.siteId,
        category: dto.category,
        isActive: dto.isActive ?? true,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            title: t.title,
            shortDescription: t.shortDescription ?? null,
            content: t.content ?? null,
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

  async update(id: string, siteId: string, dto: UpdateStaticPageDto) {
    const staticPage = await this.findOne(id, siteId);

    const updateData: any = {};
    if (dto.category !== undefined) {
      if (!ALLOWED_CATEGORIES.has(dto.category)) {
        throw new BadRequestException(`Invalid category: ${dto.category}. Must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
      }
      updateData.category = dto.category;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.staticPage.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.staticPageTranslation.upsert({
          where: {
            staticPageId_lang: {
              staticPageId: id,
              lang: translation.lang,
            },
          },
          update: {
            title: translation.title,
            shortDescription: translation.shortDescription ?? null,
            content: translation.content ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            staticPageId: id,
            lang: translation.lang,
            title: translation.title,
            shortDescription: translation.shortDescription ?? null,
            content: translation.content ?? null,
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
    await this.findOne(id, siteId);

    await this.prisma.staticPage.delete({
      where: { id },
    });

    return { message: "Static page deleted successfully" };
  }
}


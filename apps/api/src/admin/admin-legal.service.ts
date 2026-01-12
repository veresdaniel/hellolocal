import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

const ALLOWED_KEYS = new Set(["imprint", "terms", "privacy"] as const);
type LegalKey = "imprint" | "terms" | "privacy";

export interface CreateLegalPageDto {
  siteId: string;
  key: LegalKey;
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

export interface UpdateLegalPageDto {
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
export class AdminLegalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId: string, page?: number, limit?: number) {
    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 50;
    
    const where = { siteId };
    
    // Get total count
    const total = await this.prisma.legalPage.count({ where });
    
    // Get paginated results
    const legalPages = await this.prisma.legalPage.findMany({
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
      legalPages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(id: string, siteId: string) {
    const legalPage = await this.prisma.legalPage.findFirst({
      where: { id, siteId },
      include: {
        translations: true,
      },
    });

    if (!legalPage) {
      throw new NotFoundException("Legal page not found");
    }

    return legalPage;
  }

  async findByKey(key: string, siteId: string) {
    if (!ALLOWED_KEYS.has(key as any)) {
      throw new BadRequestException(`Invalid legal page key: ${key}. Must be one of: ${Array.from(ALLOWED_KEYS).join(", ")}`);
    }

    const legalPage = await this.prisma.legalPage.findUnique({
      where: { siteId_key: { siteId, key: key as LegalKey } },
      include: {
        translations: true,
      },
    });

    if (!legalPage) {
      throw new NotFoundException("Legal page not found");
    }

    return legalPage;
  }

  async create(dto: CreateLegalPageDto) {
    if (!ALLOWED_KEYS.has(dto.key)) {
      throw new BadRequestException(`Invalid legal page key: ${dto.key}. Must be one of: ${Array.from(ALLOWED_KEYS).join(", ")}`);
    }

    return this.prisma.legalPage.create({
      data: {
        siteId: dto.siteId,
        key: dto.key,
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

  async update(id: string, siteId: string, dto: UpdateLegalPageDto) {
    const legalPage = await this.findOne(id, siteId);

    const updateData: any = {};
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.legalPage.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.legalPageTranslation.upsert({
          where: {
            legalPageId_lang: {
              legalPageId: id,
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
            legalPageId: id,
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

    await this.prisma.legalPage.delete({
      where: { id },
    });

    return { message: "Legal page deleted successfully" };
  }
}


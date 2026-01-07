import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

const ALLOWED_KEYS = new Set(["imprint", "terms", "privacy"] as const);
type LegalKey = "imprint" | "terms" | "privacy";

export interface CreateLegalPageDto {
  tenantId: string;
  key: LegalKey;
  translations: Array<{
    lang: Lang;
    title: string;
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

  async findAll(tenantId: string) {
    return this.prisma.legalPage.findMany({
      where: { tenantId },
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const legalPage = await this.prisma.legalPage.findFirst({
      where: { id, tenantId },
      include: {
        translations: true,
      },
    });

    if (!legalPage) {
      throw new NotFoundException("Legal page not found");
    }

    return legalPage;
  }

  async findByKey(key: string, tenantId: string) {
    if (!ALLOWED_KEYS.has(key as any)) {
      throw new BadRequestException(`Invalid legal page key: ${key}. Must be one of: ${Array.from(ALLOWED_KEYS).join(", ")}`);
    }

    const legalPage = await this.prisma.legalPage.findUnique({
      where: { tenantId_key: { tenantId, key: key as LegalKey } },
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
        tenantId: dto.tenantId,
        key: dto.key,
        isActive: dto.isActive ?? true,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            title: t.title,
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

  async update(id: string, tenantId: string, dto: UpdateLegalPageDto) {
    const legalPage = await this.findOne(id, tenantId);

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
            content: translation.content ?? null,
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

    await this.prisma.legalPage.delete({
      where: { id },
    });

    return { message: "Legal page deleted successfully" };
  }
}


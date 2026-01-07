import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SlugEntityType } from "@prisma/client";
import { generateSlug } from "../slug/slug.helper";

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

  /**
   * Create slugs for a place in all languages
   * If only Hungarian translation exists, create slugs for all languages (hu, en, de) using the Hungarian name
   */
  private async createSlugsForPlace(placeId: string, tenantId: string, translations: Array<{ lang: Lang; name: string }>) {
    // Find Hungarian translation to use as fallback for missing languages
    const hungarianTranslation = translations.find((t) => t.lang === Lang.hu);
    const fallbackName = hungarianTranslation?.name || `place-${placeId}`;
    
    // Determine which languages need slugs
    const languagesToCreate: Lang[] = [];
    const translationByLang = new Map(translations.map((t) => [t.lang, t]));
    
    // Always create slugs for all supported languages (hu, en, de)
    for (const lang of [Lang.hu, Lang.en, Lang.de]) {
      languagesToCreate.push(lang);
    }

    for (const lang of languagesToCreate) {
      // Check if slug already exists for this place and language
      const existingSlug = await this.prisma.slug.findFirst({
        where: {
          tenantId,
          lang,
          entityType: SlugEntityType.place,
          entityId: placeId,
        },
      });

      // Use translation name if available for this language, otherwise use Hungarian name as fallback
      const translation = translationByLang.get(lang);
      const nameToUse = translation?.name || fallbackName;

      // Generate slug from name, or use place ID as fallback if name is empty
      let baseSlug = generateSlug(nameToUse);
      if (!baseSlug || baseSlug.trim() === "") {
        // If name is empty or generates empty slug, use place ID as fallback
        baseSlug = `place-${placeId}`;
      }
      let slug = baseSlug;
      let counter = 1;

      // Check for slug conflicts and append counter if needed
      while (true) {
        const conflictingSlug = await this.prisma.slug.findFirst({
          where: {
            tenantId,
            lang,
            slug,
            NOT: {
              id: existingSlug?.id, // Exclude the current slug from conflict check
            },
          },
        });

        if (!conflictingSlug) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create or update the slug
      if (existingSlug) {
        await this.prisma.slug.update({
          where: { id: existingSlug.id },
          data: {
            slug,
            isPrimary: true,
            isActive: true,
          },
        });
      } else {
        await this.prisma.slug.create({
          data: {
            tenantId,
            lang,
            slug,
            entityType: SlugEntityType.place,
            entityId: placeId,
            isPrimary: true,
            isActive: true,
          },
        });
      }
    }
  }

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

    // Automatically create slugs for all translations
    await this.createSlugsForPlace(place.id, place.tenantId, translations);

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

    // Always update slugs for all languages, using all existing translations
    // Fetch all current translations to ensure we have the complete set
    const allTranslations = await this.prisma.placeTranslation.findMany({
      where: { placeId: id },
      select: { lang: true, name: true },
    });

    // If we have translations from the update, merge them with existing ones
    // (prefer updated translations over existing ones)
    const translationMap = new Map(allTranslations.map((t) => [t.lang, t.name]));
    if (translations) {
      for (const translation of translations) {
        translationMap.set(translation.lang, translation.name);
      }
    }

    // Convert to array format expected by createSlugsForPlace
    const translationsForSlugs = Array.from(translationMap.entries()).map(([lang, name]) => ({
      lang: lang as Lang,
      name,
    }));

    // Always create/update slugs for all languages
    if (translationsForSlugs.length > 0) {
      await this.createSlugsForPlace(id, tenantId, translationsForSlugs);
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

  /**
   * Generate missing slugs for all places in a tenant
   */
  async generateMissingSlugs(tenantId: string) {
    const places = await this.prisma.place.findMany({
      where: { tenantId },
      include: {
        translations: true,
      },
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const place of places) {
      for (const translation of place.translations) {
        // Check if slug already exists
        const existingSlug = await this.prisma.slug.findFirst({
          where: {
            tenantId,
            lang: translation.lang,
            entityType: SlugEntityType.place,
            entityId: place.id,
          },
        });

        if (existingSlug) {
          skippedCount++;
          continue;
        }

        // Generate slug
        const baseSlug = generateSlug(translation.name);
        let slug = baseSlug;
        let counter = 1;

        // Check for conflicts
        while (true) {
          const conflictingSlug = await this.prisma.slug.findFirst({
            where: {
              tenantId,
              lang: translation.lang,
              slug,
            },
          });

          if (!conflictingSlug) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Create the slug
        await this.prisma.slug.create({
          data: {
            tenantId,
            lang: translation.lang,
            slug,
            entityType: SlugEntityType.place,
            entityId: place.id,
            isPrimary: true,
            isActive: true,
          },
        });

        createdCount++;
      }
    }

    return {
      message: "Missing slugs generated successfully",
      created: createdCount,
      skipped: skippedCount,
    };
  }
}


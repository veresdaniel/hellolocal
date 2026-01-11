import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SlugEntityType } from "@prisma/client";
import { generateSlug } from "../slug/slug.helper";

export interface OpeningHoursDto {
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  isClosed: boolean;
  openTime?: string | null; // Format: "HH:mm"
  closeTime?: string | null; // Format: "HH:mm"
}

export interface CreatePlaceDto {
  tenantId: string;
  townId?: string | null;
  categoryId: string;
  priceBandId?: string | null;
  tagIds?: string[];
  ownerId?: string | null;
  openingHours?: OpeningHoursDto[]; // New: structured opening hours
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
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
  openingHours?: OpeningHoursDto[]; // New: structured opening hours
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
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
   * @param throwOnConflict - If true, throw BadRequestException when slug conflict is detected instead of auto-resolving
   */
  private async createSlugsForPlace(placeId: string, tenantId: string, translations: Array<{ lang: Lang; name: string }>, throwOnConflict: boolean = false) {
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

      // Check for slug conflicts
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

      // If conflict detected and throwOnConflict is true, throw error
      if (conflictingSlug && throwOnConflict) {
        const langName = lang === Lang.hu ? "magyar" : lang === Lang.en ? "angol" : "német";
        throw new BadRequestException(
          `A slug "${slug}" már létezik ${langName} nyelven. Kérjük, használjon másik nevet vagy módosítsa a meglévő helyet.`
        );
      }

      // Auto-resolve conflicts by appending counter if needed (only if throwOnConflict is false)
      if (conflictingSlug && !throwOnConflict) {
        while (true) {
          const nextConflictingSlug = await this.prisma.slug.findFirst({
            where: {
              tenantId,
              lang,
              slug,
              NOT: {
                id: existingSlug?.id,
              },
            },
          });

          if (!nextConflictingSlug) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      // Create or update the slug with redirect support
      if (existingSlug) {
        const oldSlug = existingSlug.slug;
        
        // If the slug has changed, create a redirect from old to new
        if (oldSlug !== slug) {
          // First, check if there's already a slug with the new value (shouldn't happen due to conflict check, but safety)
          const newSlugExists = await this.prisma.slug.findUnique({
            where: { tenantId_lang_slug: { tenantId, lang, slug } },
          });

          if (!newSlugExists) {
            // Create new slug with isPrimary = true
            const newSlug = await this.prisma.slug.create({
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

            // Update old slug to redirect to new slug
            await this.prisma.slug.update({
              where: { id: existingSlug.id },
              data: {
                isPrimary: false, // Old slug is no longer primary
                isActive: true, // Keep active so redirect works
                redirectToId: newSlug.id, // Redirect to new slug
              },
            });
          } else {
            // If new slug already exists, just update the existing slug to point to it
            await this.prisma.slug.update({
              where: { id: existingSlug.id },
              data: {
                isPrimary: false,
                isActive: true,
                redirectToId: newSlugExists.id,
              },
            });
          }
        } else {
          // Slug hasn't changed, just update if needed
          await this.prisma.slug.update({
            where: { id: existingSlug.id },
            data: {
              slug,
              isPrimary: true,
              isActive: true,
              redirectToId: null, // Clear any redirects
            },
          });
        }
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

  async findAll(tenantId: string, page?: number, limit?: number) {
    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 50;
    
    const where = { tenantId };
    
    // Get total count
    const total = await this.prisma.place.count({ where });
    
    // Get paginated results
    const places = await this.prisma.place.findMany({
      where,
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
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    
    // Always return paginated response
    return {
      places,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
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
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    return place;
  }

  async create(dto: CreatePlaceDto) {
    const { tagIds = [], translations, openingHours = [], ...placeData } = dto;

    const place = await this.prisma.place.create({
      data: {
        ...placeData,
        isActive: dto.isActive ?? true,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
            address: t.address ?? null,
            phone: t.phone ?? null,
            email: t.email ?? null,
            website: t.website ?? null,
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
        openingHours: {
          create: openingHours.map((oh) => ({
            dayOfWeek: oh.dayOfWeek,
            isClosed: oh.isClosed,
            openTime: oh.isClosed ? null : oh.openTime,
            closeTime: oh.isClosed ? null : oh.closeTime,
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
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    // Automatically create slugs for all translations
    // Throw error if slug conflict is detected (admin should be aware of conflicts)
    await this.createSlugsForPlace(place.id, place.tenantId, translations, true);

    return place;
  }

  async update(id: string, tenantId: string, dto: UpdatePlaceDto) {
    const place = await this.findOne(id, tenantId);

    const { tagIds, translations, openingHours, ...restData } = dto;

    // Build update data object, explicitly handling all fields to ensure proper updates
    const updateData: any = {};
    
    // Copy all fields from restData (categoryId, townId, priceBandId, heroImage, isActive, etc.)
    if (restData.categoryId !== undefined) updateData.categoryId = restData.categoryId;
    if (restData.townId !== undefined) updateData.townId = restData.townId;
    if (restData.priceBandId !== undefined) updateData.priceBandId = restData.priceBandId;
    if (restData.heroImage !== undefined) updateData.heroImage = restData.heroImage;
    if (restData.gallery !== undefined) updateData.gallery = restData.gallery;
    if (restData.isActive !== undefined) updateData.isActive = restData.isActive;
    if (restData.ratingAvg !== undefined) updateData.ratingAvg = restData.ratingAvg;
    if (restData.ratingCount !== undefined) updateData.ratingCount = restData.ratingCount;
    if (restData.extras !== undefined) updateData.extras = restData.extras;
    if (restData.ownerId !== undefined) updateData.ownerId = restData.ownerId;
    
    // Explicitly handle lat and lng to ensure null values are properly set
    if (dto.lat !== undefined) {
      updateData.lat = dto.lat;
    }
    if (dto.lng !== undefined) {
      updateData.lng = dto.lng;
    }

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

    // Handle opening hours updates
    if (openingHours !== undefined) {
      // Delete existing opening hours
      await this.prisma.placeOpeningHours.deleteMany({
        where: { placeId: id },
      });
      
      // Create new opening hours
      if (openingHours.length > 0) {
        await this.prisma.placeOpeningHours.createMany({
          data: openingHours.map((oh) => ({
            placeId: id,
            dayOfWeek: oh.dayOfWeek,
            isClosed: oh.isClosed,
            openTime: oh.isClosed ? null : oh.openTime,
            closeTime: oh.isClosed ? null : oh.closeTime,
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
            description: translation.description ?? null,
            address: translation.address ?? null,
            phone: translation.phone ?? null,
            email: translation.email ?? null,
            website: translation.website ?? null,
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
            description: translation.description ?? null,
            address: translation.address ?? null,
            phone: translation.phone ?? null,
            email: translation.email ?? null,
            website: translation.website ?? null,
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
      // Throw error if slug conflict is detected (admin should be aware of conflicts)
      await this.createSlugsForPlace(id, tenantId, translationsForSlugs, true);
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


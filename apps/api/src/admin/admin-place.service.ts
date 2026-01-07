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
   */
  private async createSlugsForPlace(placeId: string, tenantId: string, translations: Array<{ lang: Lang; name: string }>) {
    for (const translation of translations) {
      // Check if slug already exists for this place and language
      const existingSlug = await this.prisma.slug.findFirst({
        where: {
          tenantId,
          lang: translation.lang,
          entityType: SlugEntityType.place,
          entityId: placeId,
        },
      });

      const baseSlug = generateSlug(translation.name);
      let slug = baseSlug;
      let counter = 1;

      // Check for slug conflicts and append counter if needed
      while (true) {
        const conflictingSlug = await this.prisma.slug.findFirst({
          where: {
            tenantId,
            lang: translation.lang,
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
            lang: translation.lang,
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
      
      // Update slugs for modified translations
      await this.createSlugsForPlace(id, tenantId, translations);
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


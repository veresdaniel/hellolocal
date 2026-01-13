import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SlugEntityType, UserRole, SiteRole, PlaceRole, PlacePlan, SitePlan } from "@prisma/client";
import { generateSlug } from "../slug/slug.helper";
import { RbacService } from "../auth/rbac.service";
import { canAddImage, canBeFeatured, type PlacePlan as PlacePlanType } from "../config/place-limits.config";
import { canHaveFeaturedPlaces, canAddFeaturedPlace, getSiteLimits, type SitePlanType } from "../config/site-limits.config";
import { PlaceUpsellService } from "../entitlements/place-upsell.service";
import { EntitlementsService } from "../entitlements/entitlements.service";

export interface OpeningHoursDto {
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  isClosed: boolean;
  openTime?: string | null; // Format: "HH:mm"
  closeTime?: string | null; // Format: "HH:mm"
}

export interface CreatePlaceDto {
  siteId: string;
  townId?: string | null;
  categoryId: string;
  priceBandId?: string | null;
  tagIds?: string[];
  ownerId?: string | null;
  openingHours?: OpeningHoursDto[]; // New: structured opening hours
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null; // HTML - for list view cards
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
  plan?: PlacePlan;
  isFeatured?: boolean;
  featuredUntil?: Date | string | null;
  galleryLimitOverride?: number | null;
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
    shortDescription?: string | null; // HTML - for list view cards
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
  plan?: PlacePlan;
  isFeatured?: boolean;
  featuredUntil?: Date | string | null;
  galleryLimitOverride?: number | null;
}

@Injectable()
export class AdminPlaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly placeUpsellService: PlaceUpsellService,
    private readonly entitlementsService: EntitlementsService
  ) {}

  /**
   * Create slugs for a place in all languages
   * If only Hungarian translation exists, create slugs for all languages (hu, en, de) using the Hungarian name
   * @param throwOnConflict - If true, throw BadRequestException when slug conflict is detected instead of auto-resolving
   */
  private async createSlugsForPlace(placeId: string, siteId: string, translations: Array<{ lang: Lang; name: string }>, throwOnConflict: boolean = false) {
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
          siteId,
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
          siteId,
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
              siteId,
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
            where: { siteId_lang_slug: { siteId, lang, slug } },
          });

          if (!newSlugExists) {
            // Create new slug with isPrimary = true
            const newSlug = await this.prisma.slug.create({
              data: {
                siteId,
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
            siteId,
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

  async findAll(siteId: string, page?: number, limit?: number) {
    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 50;
    
    const where = { siteId };
    
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
      orderBy: [
        { isFeatured: "desc" },
        { updatedAt: "desc" },
      ],
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

  async findOne(id: string, siteId: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, siteId },
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

    // Validate image limit based on plan (default: free)
    const plan: PlacePlanType = (dto.plan as PlacePlanType) || "free";
    const gallery = dto.gallery || [];
    const imageCount = gallery.length + (dto.heroImage ? 1 : 0);
    
    if (!canAddImage(plan, imageCount)) {
      throw new BadRequestException(
        `Plan "${plan}" allows maximum ${plan === "free" ? 3 : 15} images. You are trying to add ${imageCount} images.`
      );
    }

    // Validate featured status if provided
    if (dto.isFeatured === true && !canBeFeatured(plan)) {
      throw new BadRequestException(
        `Plan "${plan}" does not support featured placement. Upgrade to "pro" plan.`
      );
    }

    // Validate featuredUntil date (must be in the future if isFeatured is true)
    if (dto.isFeatured === true && dto.featuredUntil) {
      const featuredUntilDate = typeof dto.featuredUntil === "string" 
        ? new Date(dto.featuredUntil) 
        : dto.featuredUntil;
      if (featuredUntilDate <= new Date()) {
        throw new BadRequestException(
          "featuredUntil must be in the future when isFeatured is true"
        );
      }
    }

    const place = await this.prisma.place.create({
      data: {
        ...placeData,
        plan: dto.plan || "free",
        isFeatured: dto.isFeatured ?? false,
        featuredUntil: dto.featuredUntil 
          ? (typeof dto.featuredUntil === "string" ? new Date(dto.featuredUntil) : dto.featuredUntil)
          : null,
        isActive: dto.isActive ?? true,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            shortDescription: t.shortDescription ?? null,
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
    await this.createSlugsForPlace(place.id, place.siteId, translations, true);

    return place;
  }

  async update(id: string, siteId: string, dto: UpdatePlaceDto, userId?: string) {
    const place = await this.findOne(id, siteId);

    // Validate featured status using EntitlementsService
    if (dto.isFeatured !== undefined && dto.isFeatured === true && place.isFeatured === false) {
      const ent = await this.entitlementsService.getBySiteId(siteId);
      const gate = this.placeUpsellService.getFeaturedGate(ent, false);
      
      if (gate.state !== "enabled") {
        throw new BadRequestException(gate.reason);
      }

      // Validate featuredUntil date (must be in the future if isFeatured is true)
      const featuredUntilDate = dto.featuredUntil 
        ? (typeof dto.featuredUntil === "string" ? new Date(dto.featuredUntil) : dto.featuredUntil)
        : place.featuredUntil;
      if (featuredUntilDate && featuredUntilDate <= new Date()) {
        throw new BadRequestException(
          "featuredUntil must be in the future when isFeatured is true"
        );
      }
    }

    // Validate image limit based on plan
    if (dto.gallery !== undefined || dto.heroImage !== undefined) {
      const plan: PlacePlanType = (dto.plan as PlacePlanType) || place.plan || "free";
      const currentGallery = dto.gallery !== undefined ? dto.gallery : place.gallery;
      const currentHeroImage = dto.heroImage !== undefined ? dto.heroImage : place.heroImage;
      const imageCount = currentGallery.length + (currentHeroImage ? 1 : 0);
      
      if (!canAddImage(plan, imageCount)) {
        throw new BadRequestException(
          `Plan "${plan}" allows maximum ${plan === "free" ? 3 : 15} images. You are trying to use ${imageCount} images.`
        );
      }
    }

    // RBAC: Check permissions for restricted fields
    if (userId) {
      // Check if user can modify isActive (publish/activate)
      if (dto.isActive !== undefined && !await this.canModifyPlacePublish(userId, id, siteId)) {
        throw new ForbiddenException("Editor cannot modify place publish status");
      }

      // Check if user can modify SEO fields (slug management)
      // Name changes also affect slugs, so they need SEO permission
      const hasSeoChanges = dto.translations?.some(t => 
        t.name !== undefined ||
        t.seoTitle !== undefined || 
        t.seoDescription !== undefined || 
        t.seoImage !== undefined || 
        t.seoKeywords !== undefined
      );
      if (hasSeoChanges && !await this.canModifyPlaceSeo(userId, id, siteId)) {
        throw new ForbiddenException("Editor cannot modify place SEO settings or name (which affects slugs)");
      }
    }

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
    if (restData.plan !== undefined) updateData.plan = restData.plan;
    if (restData.isFeatured !== undefined) updateData.isFeatured = restData.isFeatured;
    if (restData.featuredUntil !== undefined) updateData.featuredUntil = restData.featuredUntil;
    if (restData.galleryLimitOverride !== undefined) updateData.galleryLimitOverride = restData.galleryLimitOverride;
    
    // Explicitly handle lat and lng to ensure null values are properly set
    if (dto.lat !== undefined) {
      updateData.lat = dto.lat;
    }
    if (dto.lng !== undefined) {
      updateData.lng = dto.lng;
    }
    // Handle featuredUntil date conversion
    if (dto.featuredUntil !== undefined) {
      updateData.featuredUntil = dto.featuredUntil 
        ? (typeof dto.featuredUntil === "string" ? new Date(dto.featuredUntil) : dto.featuredUntil)
        : null;
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
            shortDescription: translation.shortDescription ?? null,
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
            shortDescription: translation.shortDescription ?? null,
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

    // Update slugs for all languages, but only if user has permission (owner/manager can, editor cannot)
    // Slugs are updated when name changes, which is part of SEO/slug management
    if (!userId || await this.canModifyPlaceSeo(userId, id, siteId)) {
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

      // Create/update slugs for all languages (only if user has permission)
      if (translationsForSlugs.length > 0) {
        // Throw error if slug conflict is detected (admin should be aware of conflicts)
        await this.createSlugsForPlace(id, siteId, translationsForSlugs, true);
      }
    }

    return this.findOne(id, siteId);
  }

  async remove(id: string, siteId: string, userId?: string) {
    await this.findOne(id, siteId);

    // RBAC: Only owner or siteadmin can delete place
    if (userId && !await this.canDeletePlace(userId, id, siteId)) {
      throw new ForbiddenException("Only owner or siteadmin can delete place");
    }

    await this.prisma.place.delete({
      where: { id },
    });

    return { message: "Place deleted successfully" };
  }

  /**
   * Check if user can modify place publish status (isActive)
   * Permission: owner ✅, manager ✅, editor ❌
   */
  private async canModifyPlacePublish(userId: string, placeId: string, siteId: string): Promise<boolean> {
    // Check global user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Superadmin and tenantadmin can always modify
    if (user.role === UserRole.superadmin) return true;

    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId,
        },
      },
    });

    if (siteMembership?.role === SiteRole.siteadmin) return true;

    // Check place membership
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
    });

    if (!placeMembership) return false;

    // Owner and manager can modify, editor cannot
    return placeMembership.role === PlaceRole.owner || placeMembership.role === PlaceRole.manager;
  }

  /**
   * Check if user can modify place SEO settings (slug management)
   * Permission: owner ✅, manager ✅, editor ❌
   */
  private async canModifyPlaceSeo(userId: string, placeId: string, siteId: string): Promise<boolean> {
    // Same logic as canModifyPlacePublish
    return this.canModifyPlacePublish(userId, placeId, siteId);
  }

  /**
   * Check if user can delete place
   * Permission: owner ✅ (or tenantadmin), manager ❌, editor ❌
   */
  private async canDeletePlace(userId: string, placeId: string, siteId: string): Promise<boolean> {
    // Check global user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Superadmin can always delete
    if (user.role === UserRole.superadmin) return true;

    // Check tenant membership
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId,
        },
      },
    });

    // Tenantadmin can delete
    if (siteMembership?.role === SiteRole.siteadmin) return true;

    // Check place membership - only owner can delete
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
    });

    return placeMembership?.role === PlaceRole.owner;
  }

  /**
   * Generate missing slugs for all places in a tenant
   */
  async generateMissingSlugs(siteId: string) {
    const places = await this.prisma.place.findMany({
      where: { siteId },
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
            siteId,
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
              siteId,
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
            siteId,
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


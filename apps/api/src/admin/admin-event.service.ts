import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SlugEntityType, UserRole, SiteRole, PlaceRole } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { RbacService } from "../auth/rbac.service";

export interface CreateEventDto {
  siteId: string;
  placeId?: string | null;
  categoryId?: string | null; // Legacy: kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
  tagIds?: string[];
  createdByUserId?: string | null; // User who created the event (for audit trail)
  translations: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isPublished?: boolean;
  isPinned?: boolean;
  isRainSafe?: boolean; // New: whether event is rain-safe
  showOnMap?: boolean; // Whether to show event in map view event box
  startDate: Date | string;
  endDate?: Date | string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

export interface UpdateEventDto {
  placeId?: string | null;
  categoryId?: string | null; // Legacy: kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
  tagIds?: string[];
  translations?: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isPublished?: boolean;
  isPinned?: boolean;
  isRainSafe?: boolean; // New: whether event is rain-safe
  showOnMap?: boolean; // Whether to show event in map view event box
  startDate?: Date | string;
  endDate?: Date | string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

@Injectable()
export class AdminEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly rbacService: RbacService
  ) {}

  /**
   * Generate a URL-friendly slug from text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD") // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Create slugs for an event in all languages
   * @param throwOnConflict - If true, throw BadRequestException when slug conflict is detected instead of auto-resolving
   */
  private async createSlugsForEvent(eventId: string, siteId: string, translations: Array<{ lang: Lang; title: string }>, throwOnConflict: boolean = false) {
    for (const translation of translations) {
      const baseSlug = this.generateSlug(translation.title);
      let slug = baseSlug;
      let counter = 1;

      // Check for existing slugs
      const existing = await this.prisma.slug.findFirst({
        where: {
          siteId,
          lang: translation.lang,
          slug,
          NOT: {
            entityType: SlugEntityType.event,
            entityId: eventId,
          },
        },
      });

      // If conflict detected and throwOnConflict is true, throw error
      if (existing && throwOnConflict) {
        const langName = translation.lang === Lang.hu ? "magyar" : translation.lang === Lang.en ? "angol" : "német";
        throw new BadRequestException(
          `A slug "${slug}" már létezik ${langName} nyelven. Kérjük, használjon másik címet vagy módosítsa a meglévő eseményt.`
        );
      }

      // Auto-resolve conflicts by appending counter if needed (only if throwOnConflict is false)
      if (existing && !throwOnConflict) {
        while (true) {
          const nextExisting = await this.prisma.slug.findFirst({
            where: {
              siteId,
              lang: translation.lang,
              slug,
              NOT: {
                entityType: SlugEntityType.event,
                entityId: eventId,
              },
            },
          });

          if (!nextExisting) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      // Create the slug
      await this.prisma.slug.create({
        data: {
          siteId,
          lang: translation.lang,
          slug,
          entityType: SlugEntityType.event,
          entityId: eventId,
          isPrimary: true,
          isActive: true,
        },
      });
    }
  }

  /**
   * Create slugs for an event with redirect support when slug changes
   * @param throwOnConflict - If true, throw BadRequestException when slug conflict is detected instead of auto-resolving
   */
  private async createSlugsForEventWithRedirects(
    eventId: string,
    siteId: string,
    translations: Array<{ lang: Lang; title: string }>,
    existingSlugsByLang: Map<Lang, any>,
    throwOnConflict: boolean = false
  ) {
    for (const translation of translations) {
      const baseSlug = this.generateSlug(translation.title);
      let slug = baseSlug;
      let counter = 1;

      const existingSlug = existingSlugsByLang.get(translation.lang);

      // Check for existing slugs (excluding current event's slugs)
      const existing = await this.prisma.slug.findFirst({
        where: {
          siteId,
          lang: translation.lang,
          slug,
          NOT: {
            OR: [
              { entityType: SlugEntityType.event, entityId: eventId },
              { id: existingSlug?.id }, // Also exclude the current slug if it exists
            ],
          },
        },
      });

      // If conflict detected and throwOnConflict is true, throw error
      if (existing && throwOnConflict) {
        const langName = translation.lang === Lang.hu ? "magyar" : translation.lang === Lang.en ? "angol" : "német";
        throw new BadRequestException(
          `A slug "${slug}" már létezik ${langName} nyelven. Kérjük, használjon másik címet vagy módosítsa a meglévő eseményt.`
        );
      }

      // Auto-resolve conflicts by appending counter if needed (only if throwOnConflict is false)
      if (existing && !throwOnConflict) {
        while (true) {
          const nextExisting = await this.prisma.slug.findFirst({
            where: {
              siteId,
              lang: translation.lang,
              slug,
              NOT: {
                OR: [
                  { entityType: SlugEntityType.event, entityId: eventId },
                  { id: existingSlug?.id },
                ],
              },
            },
          });

          if (!nextExisting) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      if (existingSlug) {
        const oldSlug = existingSlug.slug;

        // If the slug has changed, create a redirect from old to new
        if (oldSlug !== slug) {
          // Check if there's already a slug with the new value
          const newSlugExists = await this.prisma.slug.findUnique({
            where: { siteId_lang_slug: { siteId, lang: translation.lang, slug } },
          });

          if (!newSlugExists) {
            // Create new slug with isPrimary = true
            const newSlug = await this.prisma.slug.create({
              data: {
                siteId,
                lang: translation.lang,
                slug,
                entityType: SlugEntityType.event,
                entityId: eventId,
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
        // No existing slug, create new one
        await this.prisma.slug.create({
          data: {
            siteId,
            lang: translation.lang,
            slug,
            entityType: SlugEntityType.event,
            entityId: eventId,
            isPrimary: true,
            isActive: true,
          },
        });
      }
    }
  }

  async findAll(siteId: string, page?: number, limit?: number) {
    try {
      // Default pagination values
      const pageNum = page ? parseInt(String(page)) : 1;
      const limitNum = limit ? parseInt(String(limit)) : 50;
      
      const where = { siteId };
      
      // Get total count
      const total = await this.prisma.event.count({ where });
      
      // Get paginated results
      const events = await this.prisma.event.findMany({
        where,
        include: {
          place: {
            include: {
              translations: true,
            },
          },
          category: {
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
          translations: true,
        },
        orderBy: [
          { isPinned: "desc" },
          { startDate: "asc" },
        ],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
      
      // Always return paginated response
      return {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    } catch (error) {
      console.error("Error in AdminEventService.findAll:", error);
      // Re-throw with more context
      throw new BadRequestException(
        `Failed to fetch events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async findOne(id: string, siteId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, siteId },
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        category: {
          include: {
            translations: true,
          },
        },
        categories: {
          include: {
            category: {
              include: {
                translations: true,
              },
            },
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
        translations: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async create(dto: CreateEventDto) {
    const { tagIds = [], categoryIds = [], translations, isPublished, ...eventData } = dto;

    // Validate that at least one translation is provided
    if (!translations || translations.length === 0) {
      throw new BadRequestException("At least one translation is required");
    }

    // Validate startDate
    if (!dto.startDate) {
      throw new BadRequestException("startDate is required");
    }

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        ...(dto.createdByUserId ? { createdByUserId: dto.createdByUserId } : {}),
        startDate: typeof dto.startDate === "string" ? new Date(dto.startDate) : dto.startDate,
        endDate: dto.endDate ? (typeof dto.endDate === "string" ? new Date(dto.endDate) : dto.endDate) : null,
        isActive: dto.isActive ?? true,
        isPinned: dto.isPinned ?? false,
        isRainSafe: dto.isRainSafe ?? false,
        showOnMap: dto.showOnMap ?? true,
        gallery: dto.gallery ?? [],
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            title: t.title,
            shortDescription: t.shortDescription ?? null,
            description: t.description ?? null,
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
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
      },
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        category: {
          include: {
            translations: true,
          },
        },
        categories: {
          include: {
            category: {
              include: {
                translations: true,
              },
            },
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
        translations: true,
      },
    });

    // Generate slugs for the event
    // Throw error if slug conflict is detected (admin should be aware of conflicts)
    await this.createSlugsForEvent(
      event.id,
      dto.siteId,
      translations.map((t) => ({ lang: t.lang, title: t.title })),
      true
    );

    // Send notification about new event
    // Use setTimeout to avoid blocking the response
    setTimeout(() => {
      this.notificationsService.notifyNewEvent(event.id).catch((error) => {
        console.error("Error sending new event notification:", error);
      });
    }, 100);

    return event;
  }

  async update(id: string, siteId: string, dto: UpdateEventDto) {
    const event = await this.findOne(id, siteId);
    const { tagIds, categoryIds, translations, isPublished, ...eventData } = dto;

    // Update translations if provided
    if (translations && translations.length > 0) {
      // Delete existing translations
      await this.prisma.eventTranslation.deleteMany({
        where: { eventId: id },
      });

      // Create new translations
      await this.prisma.eventTranslation.createMany({
        data: translations.map((t) => ({
          eventId: id,
          lang: t.lang,
          title: t.title,
          shortDescription: t.shortDescription ?? null,
          description: t.description ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        })),
      });

      // Update slugs for the event with redirect support
      // Get existing slugs before updating
      const existingSlugs = await this.prisma.slug.findMany({
        where: {
          siteId,
          entityType: SlugEntityType.event,
          entityId: id,
        },
      });

      // Create a map of existing slugs by language
      const existingSlugsByLang = new Map(existingSlugs.map((s) => [s.lang, s]));

      // Create new slugs (this will handle redirects if slug changed)
      // Throw error if slug conflict is detected (admin should be aware of conflicts)
      await this.createSlugsForEventWithRedirects(
        id,
        siteId,
        translations.map((t) => ({ lang: t.lang, title: t.title })),
        existingSlugsByLang,
        true
      );
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      // Delete existing tags
      await this.prisma.eventTag.deleteMany({
        where: { eventId: id },
      });

      // Create new tags
      if (tagIds.length > 0) {
        await this.prisma.eventTag.createMany({
          data: tagIds.map((tagId) => ({
            eventId: id,
            tagId,
          })),
        });
      }
    }

    // Update categories if provided
    if (categoryIds !== undefined) {
      // Delete existing categories
      await this.prisma.eventCategory.deleteMany({
        where: { eventId: id },
      });

      // Create new categories
      if (categoryIds.length > 0) {
        await this.prisma.eventCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            eventId: id,
            categoryId,
          })),
        });
      }
    }

    // Update event data
    const updateData: any = { ...eventData };
    if (dto.startDate !== undefined) {
      updateData.startDate = typeof dto.startDate === "string" ? new Date(dto.startDate) : dto.startDate;
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = dto.endDate ? (typeof dto.endDate === "string" ? new Date(dto.endDate) : dto.endDate) : null;
    }
    if (dto.gallery !== undefined) {
      updateData.gallery = dto.gallery;
    }
    if (dto.isRainSafe !== undefined) {
      updateData.isRainSafe = dto.isRainSafe;
    }

    if (dto.showOnMap !== undefined) {
      updateData.showOnMap = dto.showOnMap;
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        place: {
          include: {
            translations: true,
          },
        },
        category: {
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
        translations: true,
      },
    });

    return updated;
  }

  async remove(id: string, siteId: string, userId?: string) {
    const event = await this.findOne(id, siteId);

    // RBAC: Only owner or manager can delete event (editor cannot)
    if (userId && event.placeId && !await this.canDeleteEvent(userId, event.placeId, siteId)) {
      throw new ForbiddenException("Editor cannot delete events");
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: "Event deleted successfully" };
  }

  /**
   * Check if user can delete event
   * Permission: owner ✅, manager ✅, editor ❌
   */
  private async canDeleteEvent(userId: string, placeId: string, siteId: string): Promise<boolean> {
    // Check global user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Superadmin and tenantadmin can always delete
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

    // Owner and manager can delete, editor cannot
    return placeMembership.role === PlaceRole.owner || placeMembership.role === PlaceRole.manager;
  }
}


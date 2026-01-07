import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SlugEntityType } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

export interface CreateEventDto {
  tenantId: string;
  placeId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
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
  startDate: Date | string;
  endDate?: Date | string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

export interface UpdateEventDto {
  placeId?: string | null;
  categoryId?: string | null;
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
    private readonly notificationsService: NotificationsService
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
   */
  private async createSlugsForEvent(eventId: string, tenantId: string, translations: Array<{ lang: Lang; title: string }>) {
    for (const translation of translations) {
      const baseSlug = this.generateSlug(translation.title);
      let slug = baseSlug;
      let counter = 1;

      // Check for existing slugs and append counter if needed
      while (true) {
        const existing = await this.prisma.slug.findFirst({
          where: {
            tenantId,
            lang: translation.lang,
            slug,
          },
        });

        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create the slug
      await this.prisma.slug.create({
        data: {
          tenantId,
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

  async findAll(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenantId },
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
    });
  }

  async findOne(id: string, tenantId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId },
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

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async create(dto: CreateEventDto) {
    const { tagIds = [], translations, ...eventData } = dto;

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
        startDate: typeof dto.startDate === "string" ? new Date(dto.startDate) : dto.startDate,
        endDate: dto.endDate ? (typeof dto.endDate === "string" ? new Date(dto.endDate) : dto.endDate) : null,
        isActive: dto.isActive ?? true,
        isPinned: dto.isPinned ?? false,
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
    await this.createSlugsForEvent(
      event.id,
      dto.tenantId,
      translations.map((t) => ({ lang: t.lang, title: t.title }))
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

  async update(id: string, tenantId: string, dto: UpdateEventDto) {
    const event = await this.findOne(id, tenantId);
    const { tagIds, translations, ...eventData } = dto;

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

      // Update slugs for the event (delete old, create new)
      await this.prisma.slug.deleteMany({
        where: {
          tenantId,
          entityType: SlugEntityType.event,
          entityId: id,
        },
      });

      await this.createSlugsForEvent(
        id,
        tenantId,
        translations.map((t) => ({ lang: t.lang, title: t.title }))
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

  async remove(id: string, tenantId: string) {
    const event = await this.findOne(id, tenantId);

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: "Event deleted successfully" };
  }
}


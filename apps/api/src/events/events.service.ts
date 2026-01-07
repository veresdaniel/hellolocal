import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";

type ListArgs = {
  lang: string;
  tenantKey?: string;
  category?: string;
  placeId?: string;
  limit: number;
  offset: number;
  includePinned?: boolean;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolver: TenantKeyResolverService,
    private readonly slugResolver: SlugResolverService
  ) {}

  private normalizeLang(lang: string | undefined): Lang {
    if (!lang) {
      throw new BadRequestException("Language parameter is required. Use hu|en|de.");
    }
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException(`Unsupported lang: "${lang}". Use hu|en|de.`);
  }

  /**
   * Lists events with optional filtering.
   */
  async list(args: ListArgs) {
    const lang = this.normalizeLang(args.lang);
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    const now = new Date();
    const where: Prisma.EventWhereInput = {
      tenantId: tenant.tenantId,
      isActive: true,
      // Only show events that haven't ended yet
      // If event has endDate, it must be in the future
      // If no endDate, check startDate (must be in the future)
      OR: [
        { endDate: { gte: now } },
        { AND: [{ endDate: null }, { startDate: { gte: now } }] },
      ],
    };

    if (args.category) {
      // Find category by name in translations
      const category = await this.prisma.category.findFirst({
        where: {
          tenantId: tenant.tenantId,
          isActive: true,
          translations: {
            some: {
              lang: tenant.lang,
              name: { equals: args.category, mode: "insensitive" },
            },
          },
        },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (args.placeId) {
      where.placeId = args.placeId;
    }

    // Get events, ordered by pinned first, then by start date
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
      orderBy: [
        { isPinned: "desc" },
        { startDate: "asc" },
      ],
      take: args.limit,
      skip: args.offset,
    });

    // Helper function to get translation with fallback
    const getTranslation = (translations: Array<{ lang: Lang; [key: string]: any }>, field: string) => {
      const requested = translations.find((t) => t.lang === tenant.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    // Resolve slugs for events
    const eventsWithSlugs = await Promise.all(
      events.map(async (event) => {
        // Try to get slug in requested language
        let slug = await this.prisma.slug.findFirst({
          where: {
            tenantId: tenant.tenantId,
            lang: tenant.lang,
            entityType: SlugEntityType.event,
            entityId: event.id,
            isPrimary: true,
            isActive: true,
          },
          select: { slug: true },
        });
        
        // Fallback to Hungarian if not found and requested language is not Hungarian
        if (!slug && tenant.lang !== Lang.hu) {
          slug = await this.prisma.slug.findFirst({
            where: {
              tenantId: tenant.tenantId,
              lang: Lang.hu,
              entityType: SlugEntityType.event,
              entityId: event.id,
              isPrimary: true,
              isActive: true,
            },
            select: { slug: true },
          });
        }

        const eventTranslation = event.translations.find((t) => t.lang === tenant.lang) ||
          event.translations.find((t) => t.lang === "hu");

        const categoryName = event.category?.translations
          ? getTranslation(event.category.translations, "name")
          : null;

        const tagNames = event.tags
          .map((et) => {
            if (!et.tag?.translations) return null;
            return getTranslation(et.tag.translations, "name");
          })
          .filter((name: string | null): name is string => name !== null);

        // Get place slug if event is linked to a place
        let placeSlug: string | null = null;
        let placeName: string | null = null;
        if (event.placeId) {
          let placeSlugRecord = await this.prisma.slug.findFirst({
            where: {
              tenantId: tenant.tenantId,
              lang: tenant.lang,
              entityType: SlugEntityType.place,
              entityId: event.placeId,
              isPrimary: true,
              isActive: true,
            },
            select: { slug: true },
          });
          
          // Fallback to Hungarian if not found
          if (!placeSlugRecord && tenant.lang !== Lang.hu) {
            placeSlugRecord = await this.prisma.slug.findFirst({
              where: {
                tenantId: tenant.tenantId,
                lang: Lang.hu,
                entityType: SlugEntityType.place,
                entityId: event.placeId,
                isPrimary: true,
                isActive: true,
              },
              select: { slug: true },
            });
          }
          
          placeSlug = placeSlugRecord?.slug ?? null;

          const placeTranslation = event.place?.translations.find((t) => t.lang === tenant.lang) ||
            event.place?.translations.find((t) => t.lang === "hu");
          placeName = placeTranslation?.name ?? null;
        }

        return {
          id: event.id,
          slug: slug?.slug ?? event.id, // Fallback to ID if no slug
          tenantKey: tenant.canonicalTenantKey ?? null,
          category: categoryName,
          name: eventTranslation?.title ?? "(missing translation)",
          shortDescription: eventTranslation?.shortDescription ?? null,
          description: eventTranslation?.description ?? null,
          heroImage: event.heroImage ?? null,
          gallery: event.gallery,
          location: event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null,
          placeId: event.placeId,
          placeSlug,
          placeName,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate?.toISOString() ?? null,
          isPinned: event.isPinned,
          tags: tagNames,
          seo: {
            title: eventTranslation?.seoTitle ?? null,
            description: eventTranslation?.seoDescription ?? null,
            image: eventTranslation?.seoImage ?? null,
            keywords: eventTranslation?.seoKeywords ?? [],
          },
        };
      })
    );

    return eventsWithSlugs;
  }

  /**
   * Gets a single event by its public slug.
   */
  async detail(args: { lang: string; tenantKey?: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    // Resolve slug to get the eventId
    const r = await this.slugResolver.resolve({
      tenantId: tenant.tenantId,
      lang: tenant.lang,
      slug: args.slug,
    });

    if (r.entityType !== SlugEntityType.event) {
      throw new NotFoundException("Not an event slug");
    }

    // Fetch event by ID
    const event = await this.prisma.event.findUnique({
      where: { id: r.entityId },
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

    if (!event || !event.isActive) throw new NotFoundException("Event not found");

    // Helper function to get translation with fallback
    const getTranslation = (translations: Array<{ lang: Lang; [key: string]: any }>, field: string) => {
      const requested = translations.find((t) => t.lang === tenant.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    const eventTranslation = event.translations.find((t) => t.lang === tenant.lang) ||
      event.translations.find((t) => t.lang === "hu");

    const categoryName = event.category?.translations
      ? getTranslation(event.category.translations, "name")
      : null;

    const tagNames = event.tags
      .map((et) => {
        if (!et.tag?.translations) return null;
        return getTranslation(et.tag.translations, "name");
      })
      .filter((name: string | null): name is string => name !== null);

    // Get place slug if event is linked to a place
    let placeSlug: string | null = null;
    let placeName: string | null = null;
    if (event.placeId) {
      const placeSlugRecord = await this.prisma.slug.findFirst({
        where: {
          tenantId: tenant.tenantId,
          lang: tenant.lang,
          entityType: SlugEntityType.place,
          entityId: event.placeId,
          isPrimary: true,
          isActive: true,
        },
        select: { slug: true },
      });
      placeSlug = placeSlugRecord?.slug ?? null;

      const placeTranslation = event.place?.translations.find((t) => t.lang === tenant.lang) ||
        event.place?.translations.find((t) => t.lang === "hu");
      placeName = placeTranslation?.name ?? null;
    }

    return {
      id: event.id,
      slug: r.canonicalSlug,
      redirected: r.redirected,
      tenantKey: tenant.canonicalTenantKey ?? null,
      tenantRedirected: tenant.redirected,
      category: categoryName,
      name: eventTranslation?.title ?? "(missing translation)",
      shortDescription: eventTranslation?.shortDescription ?? null,
      description: eventTranslation?.description ?? null,
      heroImage: event.heroImage ?? null,
      gallery: event.gallery,
      location: event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null,
      placeId: event.placeId,
      placeSlug,
      placeName,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      isPinned: event.isPinned,
      tags: tagNames,
      seo: {
        title: eventTranslation?.seoTitle ?? null,
        description: eventTranslation?.seoDescription ?? null,
        image: eventTranslation?.seoImage ?? null,
        keywords: eventTranslation?.seoKeywords ?? [],
      },
    };
  }
}


import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";

type ListArgs = {
  lang: string;
  siteKey?: string;
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
    private readonly siteResolver: SiteKeyResolverService,
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
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    const now = new Date();
    const where: Prisma.EventWhereInput = {
      siteId: site.siteId,
      isActive: true,
      // Only show events that haven't ended yet
      // If event has endDate, it must be in the future
      // If no endDate, check startDate (must be in the future)
      OR: [{ endDate: { gte: now } }, { AND: [{ endDate: null }, { startDate: { gte: now } }] }],
    };

    if (args.category) {
      // Find category by name in translations
      const category = await this.prisma.category.findFirst({
        where: {
          siteId: site.siteId,
          isActive: true,
          translations: {
            some: {
              lang: site.lang,
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
      orderBy: [{ isPinned: "desc" }, { startDate: "asc" }],
      take: args.limit,
      skip: args.offset,
    });

    // Helper function to get translation with fallback
    const getTranslation = (
      translations: Array<{ lang: Lang; [key: string]: any }>,
      field: string
    ) => {
      const requested = translations.find((t) => t.lang === site.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    // Resolve slugs for events
    const eventsWithSlugs = await Promise.all(
      events.map(async (event) => {
        // Try to get slug in requested language
        // Use orderBy to ensure we get the most recent one if there are duplicates
        let slug = await this.prisma.slug.findFirst({
          where: {
            siteId: site.siteId,
            lang: site.lang,
            entityType: SlugEntityType.event,
            entityId: event.id,
            isPrimary: true,
            isActive: true,
          },
          select: { slug: true },
          orderBy: { createdAt: "desc" }, // Get the most recent one if duplicates exist
        });

        // Fallback to Hungarian if not found and requested language is not Hungarian
        if (!slug && site.lang !== Lang.hu) {
          slug = await this.prisma.slug.findFirst({
            where: {
              siteId: site.siteId,
              lang: Lang.hu,
              entityType: SlugEntityType.event,
              entityId: event.id,
              isPrimary: true,
              isActive: true,
            },
            select: { slug: true },
            orderBy: { createdAt: "desc" }, // Get the most recent one if duplicates exist
          });
        }

        const eventTranslation =
          event.translations.find((t) => t.lang === site.lang) ||
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
              siteId: site.siteId,
              lang: site.lang,
              entityType: SlugEntityType.place,
              entityId: event.placeId,
              isPrimary: true,
              isActive: true,
            },
            select: { slug: true },
          });

          // Fallback to Hungarian if not found
          if (!placeSlugRecord && site.lang !== Lang.hu) {
            placeSlugRecord = await this.prisma.slug.findFirst({
              where: {
                siteId: site.siteId,
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

          const placeTranslation =
            event.place?.translations.find((t) => t.lang === site.lang) ||
            event.place?.translations.find((t) => t.lang === "hu");
          placeName = placeTranslation?.name ?? null;
        }

        return {
          id: event.id,
          slug: slug?.slug ?? event.id, // Fallback to ID if no slug
          siteKey: site.canonicalSiteKey ?? null,
          category: categoryName,
          name: eventTranslation?.title ?? "(missing translation)",
          shortDescription: eventTranslation?.shortDescription ?? null,
          description: eventTranslation?.description ?? null,
          heroImage: event.heroImage ?? null,
          location: event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null,
          placeId: event.placeId,
          placeSlug,
          placeName,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate?.toISOString() ?? null,
          isPinned: event.isPinned,
          isRainSafe: event.isRainSafe ?? false,
          showOnMap: event.showOnMap ?? true,
          tags: tagNames,
          rating: { avg: event.ratingAvg ?? null, count: event.ratingCount ?? null },
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
   * Uses resolve → by-id pattern for consistency.
   */
  async detail(args: { lang: string; siteKey?: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    // Resolve slug to get the eventId
    const r = await this.slugResolver.resolve({
      siteId: site.siteId,
      lang: site.lang,
      slug: args.slug,
    });

    if (r.entityType !== SlugEntityType.event) {
      throw new NotFoundException("Not an event slug");
    }

    // Fetch event by ID using detailById (reuse logic, avoid duplication)
    const eventData = await this.detailById({
      lang: args.lang,
      siteKey: args.siteKey,
      eventId: r.entityId,
    });

    // Override slug and redirect info from resolution
    return {
      ...eventData,
      slug: r.canonicalSlug,
      redirected: r.redirected,
      siteRedirected: site.redirected,
    };
  }

  /**
   * Gets a single event by its entity ID (stable, future-proof).
   * Returns full event details including SEO data.
   * This method is used after slug resolution to fetch event data by ID.
   */
  async detailById(args: { lang: string; siteKey?: string; eventId: string }) {
    const lang = this.normalizeLang(args.lang);
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    // Fetch event by ID
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
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

    if (!event || !event.isActive || event.siteId !== site.siteId) {
      throw new NotFoundException("Event not found");
    }

    // Get canonical slug for this event
    const canonicalSlugRecord = await this.prisma.slug.findFirst({
      where: {
        siteId: site.siteId,
        lang: site.lang,
        entityType: SlugEntityType.event,
        entityId: args.eventId,
        isPrimary: true,
        isActive: true,
      },
      select: { slug: true },
    });

    const canonicalSlug = canonicalSlugRecord?.slug ?? args.eventId;

    // Helper function to get translation with fallback
    const getTranslation = (
      translations: Array<{ lang: Lang; [key: string]: any }>,
      field: string
    ) => {
      const requested = translations.find((t) => t.lang === site.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    const eventTranslation =
      event.translations.find((t) => t.lang === site.lang) ||
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
          siteId: site.siteId,
          lang: site.lang,
          entityType: SlugEntityType.place,
          entityId: event.placeId,
          isPrimary: true,
          isActive: true,
        },
        select: { slug: true },
      });
      placeSlug = placeSlugRecord?.slug ?? null;

      const placeTranslation =
        event.place?.translations.find((t) => t.lang === site.lang) ||
        event.place?.translations.find((t) => t.lang === "hu");
      placeName = placeTranslation?.name ?? null;
    }

    return {
      id: event.id,
      slug: canonicalSlug,
      redirected: false, // No redirect when fetching by ID
      siteKey: site.canonicalSiteKey ?? null,
      siteRedirected: site.redirected,
      category: categoryName,
      name: eventTranslation?.title ?? "(missing translation)",
      shortDescription: eventTranslation?.shortDescription ?? null,
      description: eventTranslation?.description ?? null,
      heroImage: event.heroImage ?? null,
      location: event.lat && event.lng ? { lat: event.lat, lng: event.lng } : null,
      placeId: event.placeId,
      placeSlug,
      placeName,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      isPinned: event.isPinned,
      isRainSafe: event.isRainSafe ?? false,
      tags: tagNames,
      rating: { avg: event.ratingAvg ?? null, count: event.ratingCount ?? null },
      seo: {
        title: eventTranslation?.seoTitle ?? null,
        description: eventTranslation?.seoDescription ?? null,
        image: eventTranslation?.seoImage ?? null,
        keywords: eventTranslation?.seoKeywords ?? [],
      },
    };
  }
}

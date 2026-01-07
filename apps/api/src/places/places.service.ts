import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";

type ListArgs = {
  lang: string;
  tenantKey?: string; // Optional tenant key from URL (for multi-tenant support)
  category?: string; // Filter by place category (winery, accommodation, etc.)
  town?: string; // Filter by town using public town slug
  q?: string; // Search query (searches in place names)
  limit: number; // Maximum number of results (1-200)
  offset: number; // Pagination offset
};

@Injectable()
export class PlacesService {
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
   * Lists places with optional filtering by category, town, and search query.
   * Returns places with their canonical slugs and related data.
   */
  async list(args: ListArgs) {
    const lang = this.normalizeLang(args.lang);

    // Step 1: Resolve tenant (either default or from tenantKey parameter)
    // This determines which tenant's data we're querying
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    // Step 2: Build Prisma where clause for filtering places
    const where: Prisma.PlaceWhereInput = {
      tenantId: tenant.tenantId,
      isActive: true, // Only return active places
    };

    // Filter by category if provided (category is now a categoryId)
    if (args.category) {
      // Find category by slug or ID - for now, assume it's an ID
      // TODO: Support category slugs in the future
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
        select: { id: true },
      });

      if (!category) {
        throw new BadRequestException(`Category not found: ${args.category}`);
      }

      where.categoryId = category.id;
    }

    // Step 3: Filter by town if provided
    // The town parameter is a public slug, which we need to resolve to a townId
    if (args.town) {
      const townResolved = await this.slugResolver.resolve({
        tenantId: tenant.tenantId,
        lang: tenant.lang,
        slug: args.town,
      });

      // Verify that the slug actually points to a town entity
      if (townResolved.entityType !== SlugEntityType.town) {
        throw new BadRequestException(`Unsupported town slug: ${args.town}`);
      }

      where.townId = townResolved.entityId;
    }

    // Filter by search query (searches in place names)
    if (args.q) {
      where.translations = {
        some: {
          lang: tenant.lang,
          name: { contains: args.q, mode: "insensitive" },
        },
      };
    }

    // Step 4: Fetch places from database
    // Note: Places don't have slugs directly - slugs are stored in a separate Slug table
    const places = await this.prisma.place.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: Math.min(Math.max(args.limit, 1), 200), // Enforce limit between 1-200
      skip: Math.max(args.offset, 0), // Ensure non-negative offset
      include: {
        town: { select: { id: true } }, // Town slug is fetched separately
        category: {
          include: {
            translations: true, // Get all translations for fallback
          },
        },
        priceBand: {
          include: {
            translations: true, // Get all translations for fallback
          },
        },
        tags: {
          where: { tag: { isActive: true } },
          include: {
            tag: {
              include: {
                translations: true, // Get all translations for fallback
              },
            },
          },
        },
        translations: true, // Get all translations for fallback
      },
    });

    // Step 5: Load canonical place slugs in a single database round-trip
    // This is more efficient than fetching slugs one-by-one
    const placeIds = places.map((p) => p.id);
    const placeSlugs = await this.prisma.slug.findMany({
      where: {
        tenantId: tenant.tenantId,
        lang: tenant.lang,
        entityType: SlugEntityType.place,
        entityId: { in: placeIds },
        isPrimary: true, // Only get the primary (canonical) slug
        isActive: true,
      },
      select: { entityId: true, slug: true },
    });
    // Create a map for O(1) lookup: placeId -> slug
    const placeSlugById = new Map(placeSlugs.map((s) => [s.entityId, s.slug]));

    // Step 6: Load canonical town slugs (if needed for the list response)
    const townIds = Array.from(
      new Set(places.map((p) => p.town?.id).filter((id): id is string => id !== null && id !== undefined))
    );
    const townSlugs = townIds.length
      ? await this.prisma.slug.findMany({
          where: {
            tenantId: tenant.tenantId,
            lang: tenant.lang,
            entityType: SlugEntityType.town,
            entityId: { in: townIds },
            isPrimary: true,
            isActive: true,
          },
          select: { entityId: true, slug: true },
        })
      : [];
    const townSlugById = new Map(townSlugs.map((s) => [s.entityId, s.slug]));

    // Helper function to get translation with fallback to Hungarian
    const getTranslation = (translations: Array<{ lang: Lang; [key: string]: any }>, field: string) => {
      const requested = translations.find((t) => t.lang === tenant.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    // Map places to response format with slugs attached
    return places.map((p) => {
      const canonicalPlaceSlug = placeSlugById.get(p.id) ?? null;
      const canonicalTownSlug = p.town?.id ? townSlugById.get(p.town.id) ?? null : null;

      // Extract category name with fallback to Hungarian
      const categoryName = p.category?.translations
        ? getTranslation(p.category.translations, "name")
        : null;

      // Extract price band name with fallback to Hungarian
      const priceBandName = p.priceBand?.translations
        ? getTranslation(p.priceBand.translations, "name")
        : null;

      // Extract tag names with fallback to Hungarian
      const tagNames = p.tags
        .map((pt: { tag: { translations: Array<{ lang: Lang; name: string }> } }) => {
          if (!pt.tag?.translations) return null;
          return getTranslation(pt.tag.translations, "name");
        })
        .filter((name: string | null): name is string => name !== null);

      // Get place translation with fallback to Hungarian
      const placeTranslation = p.translations.find((t) => t.lang === tenant.lang) ||
        p.translations.find((t) => t.lang === "hu");

      return {
        id: p.id,
        slug: canonicalPlaceSlug, // Public slug comes from the Slug table
        tenantKey: tenant.canonicalTenantKey ?? null,
        townSlug: canonicalTownSlug,
        category: categoryName,
        name: placeTranslation?.name ?? "(missing translation)",
        description: placeTranslation?.teaser ?? null,
        heroImage: p.heroImage ?? null,
        gallery: p.gallery,
        location: { lat: p.lat ?? null, lng: p.lng ?? null },
        priceBand: priceBandName,
        tags: tagNames,
        rating: { avg: p.ratingAvg ?? null, count: p.ratingCount ?? null },
        seo: {
          title: placeTranslation?.seoTitle ?? null,
          description: placeTranslation?.seoDescription ?? null,
          image: placeTranslation?.seoImage ?? null,
          keywords: placeTranslation?.seoKeywords ?? [],
        },
      };
    });
  }

  /**
   * Gets a single place by its public slug.
   * Returns full place details including contact information and SEO data.
   */
  async detail(args: { lang: string; tenantKey?: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);

    // Step 1: Resolve tenant (either default or from tenantKey parameter)
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    // Step 2: Resolve slug to get the placeId
    // The slug is a public-facing URL slug that maps to a place entity
    const r = await this.slugResolver.resolve({
      tenantId: tenant.tenantId,
      lang: tenant.lang,
      slug: args.slug,
    });

    // Verify that the slug actually points to a place entity (not a town, page, etc.)
    if (r.entityType !== SlugEntityType.place) {
      throw new NotFoundException("Not a place slug");
    }

    // Step 3: Fetch place by ID with related data
    const place = await this.prisma.place.findUnique({
      where: { id: r.entityId },
      include: {
        town: { select: { id: true } },
        category: {
          include: {
            translations: true, // Get all translations for fallback
          },
        },
        priceBand: {
          include: {
            translations: true, // Get all translations for fallback
          },
        },
        tags: {
          where: { tag: { isActive: true } },
          include: {
            tag: {
              include: {
                translations: true, // Get all translations for fallback
              },
            },
          },
        },
        translations: true, // Get all translations for fallback
      },
    });

    if (!place || !place.isActive) throw new NotFoundException("Place not found");

    // Step 4: Get town public slug (if place belongs to a town)
    // This allows the frontend to link to the town page
    const townSlug =
      place.town?.id
        ? (
            await this.prisma.slug.findFirst({
              where: {
                tenantId: tenant.tenantId,
                lang: tenant.lang,
                entityType: SlugEntityType.town,
                entityId: place.town.id,
                isPrimary: true,
                isActive: true,
              },
              select: { slug: true },
            })
          )?.slug ?? null
        : null;

    // Helper function to get translation with fallback to Hungarian
    const getTranslation = (translations: Array<{ lang: Lang; [key: string]: any }>, field: string) => {
      const requested = translations.find((t) => t.lang === tenant.lang);
      const hungarian = translations.find((t) => t.lang === "hu");
      const translation = requested || hungarian;
      return translation?.[field] ?? null;
    };

    // Get place translation with fallback to Hungarian
    const placeTranslation = place.translations.find((t) => t.lang === tenant.lang) ||
      place.translations.find((t) => t.lang === "hu");

    // Extract category name with fallback to Hungarian
    const categoryName = place.category?.translations
      ? getTranslation(place.category.translations, "name")
      : null;

    // Extract price band name with fallback to Hungarian
    const priceBandName = place.priceBand?.translations
      ? getTranslation(place.priceBand.translations, "name")
      : null;

    // Extract tag names with fallback to Hungarian
    const tagNames = place.tags
      .map((pt: { tag: { translations: Array<{ lang: Lang; name: string }> } }) => {
        if (!pt.tag?.translations) return null;
        return getTranslation(pt.tag.translations, "name");
      })
      .filter((name: string | null): name is string => name !== null);

    return {
      id: place.id,
      slug: r.canonicalSlug, // canonical place slug
      redirected: r.redirected,
      tenantKey: tenant.canonicalTenantKey ?? null,
      tenantRedirected: tenant.redirected,
      townSlug,
      category: categoryName,
      name: placeTranslation?.name ?? "(missing translation)",
      description: placeTranslation?.description ?? null,
      heroImage: place.heroImage ?? null,
      gallery: place.gallery,
      location: { lat: place.lat ?? null, lng: place.lng ?? null },
      contact: {
        phone: placeTranslation?.phone ?? null,
        email: placeTranslation?.email ?? null,
        website: placeTranslation?.website ?? null,
        address: placeTranslation?.address ?? null,
      },
      openingHours: placeTranslation?.openingHours ?? null,
      accessibility: placeTranslation?.accessibility ?? null,
      priceBand: priceBandName,
      tags: tagNames,
      extras: place.extras ?? null,
      rating: { avg: place.ratingAvg ?? null, count: place.ratingCount ?? null },
      seo: {
        title: placeTranslation?.seoTitle ?? null,
        description: placeTranslation?.seoDescription ?? null,
        image: placeTranslation?.seoImage ?? null,
        keywords: placeTranslation?.seoKeywords ?? [],
      },
    };
  }
}
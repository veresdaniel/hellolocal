import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";

type ListArgs = {
  lang: string;
  tenantKey?: string; // Optional tenant key from URL (for multi-tenant support)
  category?: string | string[]; // Filter by place category (name or ID) - can be multiple (OR logic)
  priceBand?: string | string[]; // Filter by price band (name or ID) - can be multiple (OR logic)
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
    const baseWhere: Prisma.PlaceWhereInput = {
      tenantId: tenant.tenantId,
      isActive: true, // Only return active places
    };

    // Collect category and price band IDs for OR logic
    const categoryIds: string[] = [];
    const priceBandIds: string[] = [];

    // Resolve categories if provided (OR logic - any of the selected categories)
    if (args.category && args.category.length > 0) {
      const categoryNames = Array.isArray(args.category) ? args.category : [args.category];
      
      for (const categoryName of categoryNames) {
        const trimmedName = categoryName.trim();
        
        // Try to find category by exact name match first
        let category = await this.prisma.category.findFirst({
          where: {
            tenantId: tenant.tenantId,
            isActive: true,
            translations: {
              some: {
                lang: tenant.lang,
                name: { equals: trimmedName, mode: "insensitive" },
              },
            },
          },
          select: { id: true },
        });

        // If not found, try with contains (partial match) as fallback
        if (!category) {
          category = await this.prisma.category.findFirst({
            where: {
              tenantId: tenant.tenantId,
              isActive: true,
              translations: {
                some: {
                  lang: tenant.lang,
                  name: { contains: trimmedName, mode: "insensitive" },
                },
              },
            },
            select: { id: true },
          });
        }

        if (category) {
          categoryIds.push(category.id);
        }
      }
    }

    // Resolve price bands if provided (OR logic - any of the selected price bands)
    if (args.priceBand && args.priceBand.length > 0) {
      const priceBandParams = Array.isArray(args.priceBand) ? args.priceBand : [args.priceBand];
      
      for (const priceBandParam of priceBandParams) {
        const trimmedParam = priceBandParam.trim();
        
        // First, try to use it as an ID (if it looks like a CUID)
        // CUIDs are typically 25 characters long and start with 'c'
        if (trimmedParam.length === 25 && trimmedParam.startsWith('c')) {
          // Try to find by ID first
          const priceBandById = await this.prisma.priceBand.findFirst({
            where: {
              id: trimmedParam,
              tenantId: tenant.tenantId,
              isActive: true,
            },
            select: { id: true },
          });
          
          if (priceBandById) {
            priceBandIds.push(priceBandById.id);
          }
        } else {
          // Otherwise, treat it as a name and search for it
          let priceBand = await this.prisma.priceBand.findFirst({
            where: {
              tenantId: tenant.tenantId,
              isActive: true,
              translations: {
                some: {
                  lang: tenant.lang,
                  name: { equals: trimmedParam, mode: "insensitive" },
                },
              },
            },
            select: { id: true },
          });

          // If not found, try with contains (partial match) as fallback
          if (!priceBand) {
            priceBand = await this.prisma.priceBand.findFirst({
              where: {
                tenantId: tenant.tenantId,
                isActive: true,
                translations: {
                  some: {
                    lang: tenant.lang,
                    name: { contains: trimmedParam, mode: "insensitive" },
                  },
                },
              },
              select: { id: true },
            });
          }

          if (priceBand) {
            priceBandIds.push(priceBand.id);
          }
        }
      }
    }

    // Build where clause with OR logic between categories and price bands
    // If both are selected, place must match ANY category OR ANY price band
    const where: Prisma.PlaceWhereInput = {
      ...baseWhere,
    };

    if (categoryIds.length > 0 && priceBandIds.length > 0) {
      // OR logic: match any category OR any price band
      where.OR = [
        { categoryId: { in: categoryIds } },
        { priceBandId: { in: priceBandIds } },
      ];
    } else if (categoryIds.length > 0) {
      // Only categories selected
      where.categoryId = { in: categoryIds };
    } else if (priceBandIds.length > 0) {
      // Only price bands selected
      where.priceBandId = { in: priceBandIds };
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
      // NestJS automatically decodes URL parameters
      const searchQuery = args.q.trim();
      where.translations = {
        some: {
          lang: tenant.lang,
          name: { contains: searchQuery, mode: "insensitive" },
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
            translations: true, // Get all translations for fallback (id is automatically included)
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
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    // Step 5: Load canonical place slugs in a single database round-trip
    // This is more efficient than fetching slugs one-by-one
    const placeIds = places.map((p) => p.id);
    
    // First try to get slugs in the requested language
    const placeSlugs = await this.prisma.slug.findMany({
      where: {
        tenantId: tenant.tenantId,
        lang: tenant.lang,
        entityType: SlugEntityType.place,
        entityId: { in: placeIds },
        isPrimary: true, // Only get the primary (canonical) slug
        isActive: true,
      },
      select: { entityId: true, slug: true, lang: true },
    });
    
    // Create a map for O(1) lookup: placeId -> slug
    const placeSlugById = new Map(placeSlugs.map((s) => [s.entityId, s.slug]));
    
    // If requested language is not Hungarian, fetch Hungarian slugs as fallback for missing ones
    if (tenant.lang !== Lang.hu) {
      const missingPlaceIds = placeIds.filter((id) => !placeSlugById.has(id));
      if (missingPlaceIds.length > 0) {
        const fallbackSlugs = await this.prisma.slug.findMany({
          where: {
            tenantId: tenant.tenantId,
            lang: Lang.hu, // Fallback to Hungarian
            entityType: SlugEntityType.place,
            entityId: { in: missingPlaceIds },
            isPrimary: true,
            isActive: true,
          },
          select: { entityId: true, slug: true },
        });
        // Add fallback slugs to the map
        fallbackSlugs.forEach((s) => {
          if (!placeSlugById.has(s.entityId)) {
            placeSlugById.set(s.entityId, s.slug);
          }
        });
      }
    }

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
    
    // Fallback to Hungarian for missing town slugs
    if (tenant.lang !== Lang.hu && townIds.length > 0) {
      const missingTownIds = townIds.filter((id) => !townSlugById.has(id));
      if (missingTownIds.length > 0) {
        const fallbackTownSlugs = await this.prisma.slug.findMany({
          where: {
            tenantId: tenant.tenantId,
            lang: Lang.hu,
            entityType: SlugEntityType.town,
            entityId: { in: missingTownIds },
            isPrimary: true,
            isActive: true,
          },
          select: { entityId: true, slug: true },
        });
        fallbackTownSlugs.forEach((s) => {
          if (!townSlugById.has(s.entityId)) {
            townSlugById.set(s.entityId, s.slug);
          }
        });
      }
    }

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
      const categoryColor = p.category?.color ?? null;

      // Extract price band name and ID with fallback to Hungarian
      const priceBandName = p.priceBand?.translations
        ? getTranslation(p.priceBand.translations, "name")
        : null;
      const priceBandId = p.priceBand?.id ?? null;

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
        categoryColor: categoryColor,
        name: placeTranslation?.name ?? "(missing translation)",
        description: placeTranslation?.description ?? null,
        heroImage: p.heroImage ?? null,
        gallery: p.gallery,
        location: { lat: p.lat ?? null, lng: p.lng ?? null },
        priceBand: priceBandName,
        priceBandId: priceBandId,
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
            translations: true, // Get all translations for fallback (id is automatically included)
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
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
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
    const categoryColor = place.category?.color ?? null;

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
      categoryColor: categoryColor,
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
      openingHours: place.openingHours?.map((oh) => ({
        dayOfWeek: oh.dayOfWeek,
        isClosed: oh.isClosed,
        openTime: oh.openTime,
        closeTime: oh.closeTime,
      })) ?? null,
      accessibility: placeTranslation?.accessibility ?? null,
      priceBand: priceBandName,
      tags: tagNames,
      extras: place.extras ?? null,
      rating: { avg: place.ratingAvg ?? null, count: place.ratingCount ?? null },
      seo: {
        title: placeTranslation?.seoTitle ?? null,
        description: placeTranslation?.seoDescription 
          ? placeTranslation.seoDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
          : null,
        image: placeTranslation?.seoImage ?? null,
        keywords: placeTranslation?.seoKeywords ?? [],
      },
    };
  }
}
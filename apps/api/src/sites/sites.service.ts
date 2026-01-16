import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type ListArgs = {
  lang: string;
  siteKey?: string; // Optional site key from URL (for multi-site support, not used in list)
  q?: string; // Search query (searches in site names)
  limit: number; // Maximum number of results (1-200)
  offset: number; // Pagination offset
};

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes language code to ensure it's valid.
   */
  private normalizeLang(lang: string): "hu" | "en" | "de" {
    const normalized = lang.toLowerCase();
    if (normalized === "hu" || normalized === "en" || normalized === "de") {
      return normalized;
    }
    return "hu"; // Default to Hungarian
  }

  /**
   * Lists active sites with optional filtering by search query.
   * Returns sites with their translations for the requested language.
   */
  async list(args: ListArgs) {
    const lang = this.normalizeLang(args.lang);

    // Build Prisma where clause for filtering sites
    const baseWhere: any = {
      isActive: true, // Only return active sites
    };

    // If search query is provided, filter by name in translations
    if (args.q && args.q.trim()) {
      const searchQuery = args.q.trim().toLowerCase();
      baseWhere.translations = {
        some: {
          lang: lang,
          name: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      };
    }

    // Fetch sites from database
    // Using select instead of include to explicitly choose fields and avoid schema mismatch
    const sites = await this.prisma.site.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        translations: {
          select: {
            id: true,
            lang: true,
            name: true,
            shortDescription: true,
            description: true,
            heroImage: true,
            seoTitle: true,
            seoDescription: true,
            seoImage: true,
            seoKeywords: true,
          },
        },
      },
    });

    // Filter translations by language in memory
    const sitesWithFilteredTranslations = sites.map((site) => ({
      ...site,
      translations: site.translations.filter((t) => t.lang === lang),
    }));

    // Apply search filter in memory if needed
    let filteredSites = sitesWithFilteredTranslations;
    if (args.q && args.q.trim()) {
      const searchQuery = args.q.trim().toLowerCase();
      filteredSites = sitesWithFilteredTranslations.filter((site) => {
        const translation = site.translations[0];
        return translation?.name?.toLowerCase().includes(searchQuery);
      });
    }

    // Sort by createdAt descending (newest first) in memory
    const sortedSites = filteredSites.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Apply pagination after sorting
    const paginatedSites = sortedSites.slice(
      Math.max(args.offset, 0),
      Math.max(args.offset, 0) + Math.min(Math.max(args.limit, 1), 200)
    );

    // Transform sites to match the expected format
    return paginatedSites.map((site) => {
      const translation = site.translations[0] || null;

      return {
        id: site.id,
        slug: site.slug,
        name: translation?.name || `Site ${site.id}`,
        shortDescription: translation?.shortDescription || null,
        description: translation?.description || null,
        heroImage: translation?.heroImage || null,
        seoTitle: translation?.seoTitle || null,
        seoDescription: translation?.seoDescription || null,
        seoImage: translation?.seoImage || null,
        seoKeywords: translation?.seoKeywords || [],
        createdAt: site.createdAt.toISOString(),
        updatedAt: site.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Gets a single site by its slug.
   */
  async detail(args: { lang: string; siteKey?: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);

    // Find site by slug (slug is unique, but we also need to check isActive)
    const site = await this.prisma.site.findFirst({
      where: {
        slug: args.slug,
        isActive: true,
      },
      include: {
        translations: {
          where: {
            lang: lang,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException(`Site with slug "${args.slug}" not found`);
    }

    const translation = site.translations[0] || null;

    return {
      id: site.id,
      slug: site.slug,
      name: translation?.name || `Site ${site.id}`,
      shortDescription: translation?.shortDescription || null,
      description: translation?.description || null,
      heroImage: translation?.heroImage || null,
      seoTitle: translation?.seoTitle || null,
      seoDescription: translation?.seoDescription || null,
      seoImage: translation?.seoImage || null,
      seoKeywords: translation?.seoKeywords || [],
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
    };
  }
}

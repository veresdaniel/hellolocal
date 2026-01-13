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
  constructor(
    private readonly prisma: PrismaService
  ) {}

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
    const sites = await this.prisma.site.findMany({
      where: baseWhere,
      include: {
        translations: {
          where: {
            lang: lang,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(args.limit, 1), 200), // Enforce limit between 1-200
      skip: Math.max(args.offset, 0), // Ensure non-negative offset
    });

    // Transform sites to match the expected format
    return sites.map((site) => {
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

    // Find site by slug
    const site = await this.prisma.site.findUnique({
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

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";

type ListArgs = {
  lang: string;
  tenantKey?: string; // Optional tenant key from URL (for multi-tenant support)
  q?: string; // Search query (searches in tenant names)
  limit: number; // Maximum number of results (1-200)
  offset: number; // Pagination offset
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolver: TenantKeyResolverService
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
   * Lists active tenants with optional filtering by search query.
   * Returns tenants with their translations for the requested language.
   */
  async list(args: ListArgs) {
    const lang = this.normalizeLang(args.lang);

    // Build Prisma where clause for filtering tenants
    const baseWhere: any = {
      isActive: true, // Only return active tenants
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

    // Fetch tenants from database
    const tenants = await this.prisma.tenant.findMany({
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

    // Transform tenants to match the expected format
    return tenants.map((tenant) => {
      const translation = tenant.translations[0] || null;
      
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: translation?.name || `Tenant ${tenant.id}`,
        shortDescription: translation?.shortDescription || null,
        description: translation?.description || null,
        heroImage: translation?.heroImage || null,
        seoTitle: translation?.seoTitle || null,
        seoDescription: translation?.seoDescription || null,
        seoImage: translation?.seoImage || null,
        seoKeywords: translation?.seoKeywords || [],
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Gets a single tenant by its slug.
   */
  async detail(args: { lang: string; tenantKey?: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);

    // Find tenant by slug
    const tenant = await this.prisma.tenant.findUnique({
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

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${args.slug}" not found`);
    }

    const translation = tenant.translations[0] || null;

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: translation?.name || `Tenant ${tenant.id}`,
      shortDescription: translation?.shortDescription || null,
      description: translation?.description || null,
      heroImage: translation?.heroImage || null,
      seoTitle: translation?.seoTitle || null,
      seoDescription: translation?.seoDescription || null,
      seoImage: translation?.seoImage || null,
      seoKeywords: translation?.seoKeywords || [],
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}

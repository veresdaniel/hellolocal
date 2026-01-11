import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { Lang } from "@prisma/client";

@Injectable()
export class StaticPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolver: TenantKeyResolverService
  ) {}

  private normalizeLang(lang: string | undefined): Lang {
    if (lang === "hu" || lang === "en" || lang === "de") {
      return lang;
    }
    return "hu";
  }

  /**
   * Lists static pages with optional category filtering.
   * 
   * @param args - Page listing arguments
   * @param args.lang - Language code
   * @param args.tenantKey - Optional tenant key for multi-tenant support
   * @param args.category - Optional category filter (blog, tudastar, infok)
   * @returns Array of static pages with translations
   */
  async list(args: { lang: string; tenantKey?: string; category?: string }) {
    const lang = this.normalizeLang(args.lang);

    // Resolve tenant (either default or from tenantKey parameter)
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    const where: any = {
      tenantId: tenant.tenantId,
      isActive: true,
    };

    if (args.category) {
      where.category = args.category;
    }

    const staticPages = await this.prisma.staticPage.findMany({
      where,
      include: { translations: true },
      orderBy: { createdAt: "desc" },
    });

    return staticPages.map((page) => {
      // Get translation with fallback to Hungarian
      const translation = page.translations.find((t) => t.lang === lang) ||
        page.translations.find((t) => t.lang === "hu");

      if (!translation) {
        return null;
      }

      return {
        id: page.id,
        category: page.category,
        title: translation.title,
        content: translation.content ?? "",
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    }).filter((page) => page !== null);
  }

  /**
   * Gets a single static page by ID.
   * 
   * @param args - Page retrieval arguments
   * @param args.lang - Language code
   * @param args.id - Static page ID
   * @param args.tenantKey - Optional tenant key for multi-tenant support
   * @returns Static page data with translation and SEO
   */
  async detail(args: { lang: string; id: string; tenantKey?: string }) {
    const lang = this.normalizeLang(args.lang);

    // Resolve tenant (either default or from tenantKey parameter)
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    const staticPage = await this.prisma.staticPage.findFirst({
      where: {
        id: args.id,
        tenantId: tenant.tenantId,
        isActive: true,
      },
      include: { translations: true },
    });

    if (!staticPage) {
      throw new NotFoundException("Static page not found");
    }

    // Get translation with fallback to Hungarian
    const translation = staticPage.translations.find((t) => t.lang === lang) ||
      staticPage.translations.find((t) => t.lang === "hu");

    if (!translation) {
      throw new NotFoundException("Static page translation not found");
    }

    // Helper to remove HTML tags and normalize whitespace
    const stripHtml = (html: string | null | undefined): string => {
      if (!html) return "";
      // Remove HTML tags
      const text = html.replace(/<[^>]*>/g, " ");
      // Normalize whitespace (multiple spaces/newlines to single space)
      return text.replace(/\s+/g, " ").trim();
    };

    // Helper to extract first 2 sentences from HTML/text
    const getFirstSentences = (html: string | undefined, count: number = 2): string => {
      if (!html) return "";
      // Remove HTML tags
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      // Split by sentence endings (. ! ?)
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, count).join(" ").trim();
    };

    // Fallback description: first 2 sentences from content
    const fallbackDescription = getFirstSentences(translation.content, 2) || "";
    // Strip HTML from seoDescription if present
    const seoDescription = translation.seoDescription 
      ? stripHtml(translation.seoDescription) 
      : fallbackDescription;

    return {
      id: staticPage.id,
      category: staticPage.category,
      title: translation.title,
      content: translation.content ?? "",
      seo: {
        title: translation.seoTitle ?? translation.title,
        description: seoDescription,
        image: translation.seoImage ?? null,
        keywords: translation.seoKeywords ?? [],
        canonical: null,
        robots: null,
        og: { title: null, description: null, image: null, type: "website" },
        twitter: { card: "summary_large_image", title: null, description: null, image: null },
      },
      createdAt: staticPage.createdAt,
      updatedAt: staticPage.updatedAt,
    };
  }
}


import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { Lang } from "@prisma/client";

@Injectable()
export class StaticPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService
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
   * @param args.siteKey - Optional site key for multi-site support
   * @param args.category - Optional category filter (blog, tudastar, infok)
   * @returns Array of static pages with translations
   */
  async list(args: { lang: string; siteKey?: string; category?: string }) {
    const lang = this.normalizeLang(args.lang);

    // Resolve site (either default or from siteKey parameter)
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    const where: any = {
      siteId: site.siteId,
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
        shortDescription: translation.shortDescription ?? null,
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
   * @param args.siteKey - Optional site key for multi-site support
   * @returns Static page data with translation and SEO
   */
  async detail(args: { lang: string; id: string; siteKey?: string }) {
    const lang = this.normalizeLang(args.lang);

    // Resolve site (either default or from siteKey parameter)
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    const staticPage = await this.prisma.staticPage.findFirst({
      where: {
        id: args.id,
        siteId: site.siteId,
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
    const getFirstSentences = (html: string | null | undefined, count: number = 2): string => {
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
      shortDescription: translation.shortDescription ?? null,
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


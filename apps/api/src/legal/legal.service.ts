import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";

const ALLOWED_PAGES = new Set(["imprint", "terms", "privacy"] as const);
type LegalKey = "imprint" | "terms" | "privacy";

/**
 * Service for retrieving legal pages (imprint, terms, privacy).
 * Supports both single-site (default) and multi-site modes.
 */
@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService
  ) {}

  private normalizeLang(lang: string | undefined): Lang {
    if (!lang) {
      throw new BadRequestException("Language parameter is required. Use hu|en|de.");
    }
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException(`Unsupported lang: "${lang}". Use hu|en|de.`);
  }

  /**
   * Gets a legal page by key (imprint, terms, or privacy).
   * 
   * @param args - Page retrieval arguments
   * @param args.lang - Language code
   * @param args.page - Page key (imprint, terms, or privacy)
   * @param args.siteKey - Optional site key for multi-site support
   * @returns Legal page data with translations and SEO
   */
  async getPage(args: { lang: string; page: string; siteKey?: string }) {
    const lang = this.normalizeLang(args.lang);

    if (!ALLOWED_PAGES.has(args.page as any)) {
      throw new BadRequestException("Unsupported legal page. Use imprint|terms|privacy.");
    }
    const key = args.page as LegalKey;

    // Resolve site (either default or from siteKey parameter)
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    const legal = await this.prisma.legalPage.findUnique({
      where: { siteId_key: { siteId: site.siteId, key } },
      include: { translations: true }, // Get all translations for fallback
    });

    if (!legal || !legal.isActive) throw new NotFoundException("Legal page not found");

    // Get translation with fallback to Hungarian
    const t = legal.translations.find((trans) => trans.lang === site.lang) ||
      legal.translations.find((trans) => trans.lang === "hu");

    if (!t) throw new NotFoundException("Legal page translation not found");

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
    const fallbackDescription = getFirstSentences(t.content, 2) || "";
    // Strip HTML from seoDescription if present
    const seoDescription = t.seoDescription 
      ? stripHtml(t.seoDescription) 
      : fallbackDescription;

    return {
      key,
      title: t.title,
      shortDescription: t.shortDescription ?? null,
      content: t.content ?? "",
      seo: {
        title: t.seoTitle ?? t.title,
        description: seoDescription,
        image: t.seoImage ?? null,
        keywords: t.seoKeywords ?? [],
        canonical: null,
        robots: null,
        og: { title: null, description: null, image: null, type: "website" },
        twitter: { card: "summary_large_image", title: null, description: null, image: null },
      },
    };
  }
}

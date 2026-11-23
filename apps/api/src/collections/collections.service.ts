import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "../common/language-code";
import { langOrDefault } from "../common/lang";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

/**
 * Public read API for curated region collections (custom domain or slug).
 * Builds language-aware view models with per-item title/image overrides.
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(lang: string): Lang {
    const normalized = lang.toLowerCase();
    if (normalized === "hu" || normalized === "en" || normalized === "de") {
      return normalized as Lang;
    }
    return Lang.hu; // Default fallback
  }

  /**
   * Resolves collection by domain or slug.
   * Priority: domain match > slug match
   */
  async resolveCollection(args: { domain?: string; slug?: string }) {
    const includeOptions = {
      translations: true,
      items: {
        include: {
          site: {
            select: {
              id: true,
              slug: true,
              translations: true,
            },
          },
          translations: true,
        },
        orderBy: { order: "asc" as const },
      },
    };

    // Try domain first
    if (args.domain) {
      const collection = await this.prisma.collection.findUnique({
        where: { domain: args.domain },
        include: includeOptions,
      });

      if (collection && collection.isActive) {
        return collection;
      }
    }

    // Fallback to slug
    if (args.slug) {
      const collection = await this.prisma.collection.findUnique({
        where: { slug: args.slug },
        include: includeOptions,
      });

      if (collection && collection.isActive) {
        return collection;
      }
    }

    throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_COLLECTION);
  }

  /**
   * Language-specific public view for a collection (by domain or slug).
   *
   * Collection copy uses CollectionTranslation[lang], falling back to `hu`.
   * Each item displays override fields when set, otherwise the linked SiteTranslation.
   *
   * @param args.lang - Requested content language
   * @param args.domain - Custom hostname (checked before slug)
   * @param args.slug - Public collection slug
   * @returns Title, SEO, hero, and ordered items with display title/description/image
   */
  async getCollectionView(args: { lang: string; domain?: string; slug?: string }) {
    const lang = this.normalizeLang(args.lang);
    const collection = await this.resolveCollection(args);

    // Get collection translation with fallback
    const collectionTranslation =
      collection.translations.find((t) => t.lang === lang) ||
      collection.translations.find((t) => t.lang === Lang.hu);

    if (!collectionTranslation) {
      throw new NotFoundException("Collection translation not found");
    }

    // Build items view model
    const items = collection.items.map((item) => {
      // Get item translation for current lang
      const itemTranslation = item.translations.find((t) => t.lang === lang);

      // Get site translation for current lang (fallback to hu)
      const siteTranslation =
        item.site.translations.find((t) => t.lang === lang) ||
        item.site.translations.find((t) => t.lang === Lang.hu);

      // Build display fields
      const title =
        itemTranslation?.titleOverride ?? siteTranslation?.name ?? `Site ${item.site.id}`;
      const description =
        itemTranslation?.descriptionOverride ?? siteTranslation?.shortDescription ?? null;
      const image = itemTranslation?.imageOverride ?? siteTranslation?.heroImage ?? null; // TODO: Add site.default/brand placeholder if needed

      return {
        id: item.id,
        siteId: item.siteId,
        siteSlug: item.site.slug,
        order: item.order,
        isHighlighted: item.isHighlighted,
        title,
        description,
        image,
      };
    });

    return {
      id: collection.id,
      slug: collection.slug,
      domain: collection.domain,
      isCrawlable: collection.isCrawlable,
      title: collectionTranslation.title,
      description: collectionTranslation.description ?? null,
      heroImage: collectionTranslation.heroImage ?? null,
      seo: {
        title: collectionTranslation.seoTitle ?? collectionTranslation.title,
        description: collectionTranslation.seoDescription ?? null,
        image: collectionTranslation.seoImage ?? collectionTranslation.heroImage ?? null,
        keywords: collectionTranslation.seoKeywords ?? [],
      },
      items,
    };
  }
}

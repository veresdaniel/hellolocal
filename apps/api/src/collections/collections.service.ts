import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

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
    if (args.domain) {
      const collection = await this.prisma.collection.findUnique({
        where: { domain: args.domain },
        include: {
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
            orderBy: { order: "asc" },
          },
        },
      });

      if (collection && collection.isActive) {
        return collection;
      }
    }

    if (args.slug) {
      const collection = await this.prisma.collection.findUnique({
        where: { slug: args.slug },
        include: {
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
            orderBy: { order: "asc" },
          },
        },
      });

      if (collection && collection.isActive) {
        return collection;
      }
    }

    throw new NotFoundException("Collection not found");
  }

  /**
   * Gets a collection with language-specific view model.
   * 
   * Input: collectionId, lang
   * 
   * Collection content:
   * - Uses CollectionTranslation[lang] if available
   * - Fallback: hu (or defaultLang)
   * 
   * Items list:
   * For each item:
   * 1. itemTranslation = CollectionItemTranslation[lang] if exists
   * 2. siteTranslation = SiteTranslation[lang] if exists (fallback hu)
   * 3. Displayed fields:
   *    - title: itemTranslation.titleOverride ?? siteTranslation.name
   *    - desc: itemTranslation.descriptionOverride ?? siteTranslation.shortDescription ?? null
   *    - image: itemTranslation.imageOverride ?? siteTranslation.heroImage ?? site.default/brand placeholder
   */
  async getCollectionView(args: { lang: string; domain?: string; slug?: string }) {
    const lang = this.normalizeLang(args.lang);
    const collection = await this.resolveCollection(args);

    // Get collection translation with fallback
    const collectionTranslation =
      collection.translations.find((t: any) => t.lang === lang) ||
      collection.translations.find((t: any) => t.lang === Lang.hu);

    if (!collectionTranslation) {
      throw new NotFoundException("Collection translation not found");
    }

    // Build items view model
    const items = collection.items.map((item: any) => {
      // Get item translation for current lang
      const itemTranslation = item.translations.find((t: any) => t.lang === lang);

      // Get site translation for current lang (fallback to hu)
      const siteTranslation =
        item.site.translations.find((t: any) => t.lang === lang) ||
        item.site.translations.find((t: any) => t.lang === Lang.hu);

      // Build display fields
      const title = itemTranslation?.titleOverride ?? siteTranslation?.name ?? `Site ${item.site.id}`;
      const description =
        itemTranslation?.descriptionOverride ?? siteTranslation?.shortDescription ?? null;
      const image =
        itemTranslation?.imageOverride ??
        siteTranslation?.heroImage ??
        null; // TODO: Add site.default/brand placeholder if needed

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

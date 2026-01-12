import { Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";

export type ResolveResult = {
  siteId: string;
  lang: Lang;
  entityType: SlugEntityType;
  entityId: string;
  canonical: {
    lang: Lang;
    siteKey: string;
    slug: string;
  };
  needsRedirect: boolean;
};

/**
 * General resolver service that handles both site and slug resolution.
 * 
 * This service provides a unified interface for resolving:
 * - SiteKey -> siteId (with redirect support)
 * - Slug -> entity (with redirect and primary slug support)
 * 
 * Returns canonical URL information for proper redirect handling.
 */
@Injectable()
export class ResolveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService,
    private readonly slugResolver: SlugResolverService
  ) {}

  /**
   * Resolves a site key and slug to entity information.
   * 
   * @param args - Resolution arguments
   * @param args.lang - Language code
   * @param args.siteKey - Site key from URL
   * @param args.slug - Slug from URL
   * @returns Resolved entity information with canonical URL
   */
  async resolve(args: { lang: string; siteKey: string; slug: string }): Promise<ResolveResult> {
    const lang = args.lang as Lang;

    // Step 1: Resolve site (handles SiteKey redirects)
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });

    // Step 2: Resolve slug to entity
    // First, try to find the slug directly
    const slugRecord = await this.prisma.slug.findUnique({
      where: { siteId_lang_slug: { siteId: site.siteId, lang: site.lang, slug: args.slug } },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        isPrimary: true,
        isActive: true,
        redirectToId: true,
        redirectTo: {
          select: {
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!slugRecord || !slugRecord.isActive) {
      throw new NotFoundException("Slug not found");
    }

    let canonicalSlug: string;
    let slugRedirected = false;

    // Step 3: Handle slug redirects and non-primary slugs
    if (slugRecord.redirectToId && slugRecord.redirectTo?.isActive) {
      // Case 1: Slug redirects to another slug (canonical)
      canonicalSlug = slugRecord.redirectTo.slug;
      slugRedirected = true;
    } else if (!slugRecord.isPrimary) {
      // Case 2: Slug is not primary, find the primary slug for this entity
      const primarySlug = await this.prisma.slug.findFirst({
        where: {
          siteId: site.siteId,
          lang: site.lang,
          entityType: slugRecord.entityType,
          entityId: slugRecord.entityId,
          isPrimary: true,
          isActive: true,
        },
        select: { slug: true },
      });

      if (primarySlug) {
        canonicalSlug = primarySlug.slug;
        slugRedirected = true;
      } else {
        // Fallback: use the current slug if no primary found
        canonicalSlug = args.slug;
        slugRedirected = false;
      }
    } else {
      // Case 3: Slug is primary and has no redirect
      canonicalSlug = args.slug;
      slugRedirected = false;
    }

    // Step 4: Build canonical URL information
    const canonicalSiteKey = site.canonicalSiteKey ?? args.siteKey;
    const needsRedirect = Boolean(site.redirected || slugRedirected);

    return {
      siteId: site.siteId,
      lang: site.lang,
      entityType: slugRecord.entityType,
      entityId: slugRecord.entityId,
      canonical: {
        lang: site.lang,
        siteKey: canonicalSiteKey,
        slug: canonicalSlug,
      },
      needsRedirect,
    };
  }
}

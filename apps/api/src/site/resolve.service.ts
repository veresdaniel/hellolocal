import { Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";
import { generateSlug } from "../slug/slug.helper";

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
    let slugRecord = await this.prisma.slug.findUnique({
      where: { siteId_lang_slug: { siteId: site.siteId, lang: site.lang, slug: args.slug } },
      select: {
        id: true,
        slug: true,
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

    // Fallback: If slug not found and contains accented characters, try normalized version
    let shouldRedirectToNormalized = false;
    if (!slugRecord || !slugRecord.isActive) {
      const normalizedSlug = generateSlug(args.slug);
      // Only try fallback if the normalized slug is different from the original
      if (normalizedSlug !== args.slug && normalizedSlug) {
        const normalizedSlugRecord = await this.prisma.slug.findUnique({
          where: { siteId_lang_slug: { siteId: site.siteId, lang: site.lang, slug: normalizedSlug } },
          select: {
            id: true,
            slug: true,
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
        
        if (normalizedSlugRecord && normalizedSlugRecord.isActive) {
          // Found normalized version - use it and mark for redirect
          slugRecord = normalizedSlugRecord;
          shouldRedirectToNormalized = true;
        }
      }
    }

    if (!slugRecord || !slugRecord.isActive) {
      throw new NotFoundException("Slug not found");
    }

    let canonicalSlug: string;
    let slugRedirected = false;

    // Step 3: Handle slug redirects and non-primary slugs
    // Note: If we're redirecting from accented to normalized, slugRecord.slug is already the normalized version
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
        // Fallback: use the slugRecord.slug (which may be normalized if we're redirecting)
        canonicalSlug = slugRecord.slug;
        slugRedirected = false;
      }
    } else {
      // Case 3: Slug is primary and has no redirect
      // Use slugRecord.slug (which may be normalized if we're redirecting from accented version)
      canonicalSlug = slugRecord.slug;
      slugRedirected = false;
    }

    // Step 4: Build canonical URL information
    const canonicalSiteKey = site.canonicalSiteKey ?? args.siteKey;
    // Redirect if site redirected, slug redirected, or we're redirecting from accented to normalized slug
    const needsRedirect = Boolean(site.redirected || slugRedirected || shouldRedirectToNormalized);

    return {
      siteId: site.siteId,
      lang: site.lang,
      entityType: slugRecord.entityType,
      entityId: slugRecord.entityId,
      canonical: {
        lang: site.lang,
        siteKey: canonicalSiteKey,
        slug: canonicalSlug, // This is already the normalized slug if shouldRedirectToNormalized is true
      },
      needsRedirect,
    };
  }
}

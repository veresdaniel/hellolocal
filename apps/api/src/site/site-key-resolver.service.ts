import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Request } from "express";

type ResolveSiteArgs = {
  lang: string;
  siteKey?: string; // Optional site key from URL (for multi-site support)
};

export type ResolvedSite = {
  siteId: string;
  siteInternalSlug: string; // Site.slug (internal key, used in database)
  lang: Lang;
  canonicalSiteKey?: string; // Public site key for multi-site URLs (if applicable)
  redirected: boolean; // Whether the request was redirected to a canonical site key
};

@Injectable()
export class SiteKeyResolverService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(lang: string | undefined): Lang {
    if (!lang) {
      throw new BadRequestException("Language parameter is required. Use hu|en|de.");
    }
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException(`Unsupported lang: "${lang}". Use hu|en|de.`);
  }

  private defaultSiteInternalSlug(): string {
    return process.env.DEFAULT_SITE_SLUG ?? "etyek-budai";
  }

  /**
   * Helper method to resolve site from request.
   * 
   * @param request - Express request
   * @param args - Resolution arguments (lang and optional siteKey)
   * @deprecated Use SiteResolveMiddleware and req.site instead
   */
  async resolveFromRequest(
    request: Request,
    args: { lang: string; siteKey?: string }
  ): Promise<ResolvedSite> {
    return this.resolve(args);
  }

  /**
   * Resolves the site ID from the request with the following priority:
   * 1. URL-based siteKey resolution (if siteKey is provided)
   * 2. Default site (if siteKey is not provided)
   * 
   * This service supports both single-site (implicit) and multi-site (explicit) modes.
   * In multi-site mode, the siteKey is a public-facing slug that maps to an internal site.
   * 
   * @deprecated Consider using SiteResolveMiddleware and req.site instead
   */
  async resolve(args: ResolveSiteArgs): Promise<ResolvedSite> {
    const lang = this.normalizeLang(args.lang);

    // Single-site / implicit site: use default Site.slug (internal key)
    if (!args.siteKey) {
      const s = await this.prisma.site.findUnique({
        where: { slug: this.defaultSiteInternalSlug() },
        select: { id: true, slug: true },
      });
      if (!s) throw new NotFoundException("Site not found (default)");
      return {
        siteId: s.id,
        siteInternalSlug: s.slug,
        lang,
        canonicalSiteKey: undefined,
        redirected: false,
      };
    }

    // Multi-site / explicit site: lookup SiteKey (public-facing slug)
    // The SiteKey table maps public slugs (per language) to internal site IDs
    // Note: Since unique constraint is now [siteId, lang, slug], we use findFirst
    // and prioritize isPrimary=true entries
    const hit = await this.prisma.siteKey.findFirst({
      where: {
        lang,
        slug: args.siteKey,
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary keys first
        { createdAt: 'asc' }, // Then by creation date (oldest first)
      ],
      select: { 
        id: true, 
        siteId: true, 
        slug: true, 
        isActive: true, 
        isPrimary: true, // Whether this is the primary (canonical) site key
        redirectToId: true,
        redirectTo: {
          select: {
            slug: true,
            isActive: true,
          },
        },
      },
    });

    // If SiteKey not found for this language, fallback to default site
    // This handles cases where SiteKey entries don't exist for all languages
    if (!hit || !hit.isActive) {
      // Try to find the site by its internal slug (assuming siteKey matches internal slug)
      const site = await this.prisma.site.findUnique({
        where: { slug: args.siteKey },
        select: { id: true, slug: true },
      });
      
      if (site) {
        // Site exists but no SiteKey entry for this language - use site as-is
        return {
          siteId: site.id,
          siteInternalSlug: site.slug,
          lang,
          canonicalSiteKey: args.siteKey,
          redirected: false,
        };
      }
      
      // If site doesn't exist at all, throw error
      throw new NotFoundException("Site key not found");
    }

    // Consistent redirect rules:
    // 1. If redirectToId exists and target is active → redirected=true, canonicalSiteKey = redirectTo.slug
    // 2. If not primary and no redirectToId → find primary siteKey, redirected=true, canonicalSiteKey = primary.slug
    // 3. If primary and no redirectToId → redirected=false, canonicalSiteKey = self.slug

    // Rule 1: Handle explicit redirects (redirectToId)
    // This allows URL aliases and URL migrations
    if (hit.redirectToId && hit.redirectTo?.isActive) {
      const target = await this.prisma.siteKey.findUnique({
        where: { id: hit.redirectToId },
        select: { siteId: true, slug: true, isActive: true },
      });

      if (target && target.isActive) {
        const site = await this.prisma.site.findUnique({
          where: { id: target.siteId },
          select: { id: true, slug: true },
        });
        if (!site) throw new NotFoundException("Site not found (redirect target)");

        return {
          siteId: site.id,
          siteInternalSlug: site.slug,
          lang,
          canonicalSiteKey: target.slug,
          redirected: true,
        };
      }
    }

    // Rule 2: If site key is not primary, find the primary site key for this site
    if (!hit.isPrimary) {
      const primarySiteKey = await this.prisma.siteKey.findFirst({
        where: {
          siteId: hit.siteId,
          lang: lang, // Use the lang parameter, not hit.lang (which is not selected)
          isPrimary: true,
          isActive: true,
        },
        select: { slug: true },
      });

      if (primarySiteKey) {
        const site = await this.prisma.site.findUnique({
          where: { id: hit.siteId },
          select: { id: true, slug: true },
        });
        if (!site) throw new NotFoundException("Site not found");

        return {
          siteId: site.id,
          siteInternalSlug: site.slug,
          lang,
          canonicalSiteKey: primarySiteKey.slug,
          redirected: true,
        };
      }
      // Fallback: if no primary found, use current slug (shouldn't happen in normal operation)
      const site = await this.prisma.site.findUnique({
        where: { id: hit.siteId },
        select: { id: true, slug: true },
      });
      if (!site) throw new NotFoundException("Site not found");

      return {
        siteId: site.id,
        siteInternalSlug: site.slug,
        lang,
        canonicalSiteKey: hit.slug,
        redirected: false,
      };
    }

    // Rule 3: Site key is primary and has no redirect - this is canonical
    const site = await this.prisma.site.findUnique({
      where: { id: hit.siteId },
      select: { id: true, slug: true },
    });
    if (!site) throw new NotFoundException("Site not found");

    return {
      siteId: site.id,
      siteInternalSlug: site.slug,
      lang,
      canonicalSiteKey: hit.slug,
      redirected: false,
    };
  }
}
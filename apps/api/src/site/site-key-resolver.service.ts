import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "../common/language-code";
import { requireLang } from "../common/lang";
import { normalizePublicSiteKey } from "../common/public-site-key";
import { PrismaService } from "../prisma/prisma.service";
import { Request } from "express";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

type ResolveSiteArgs = {
  lang: string;
  /** Optional public site key from the URL (multi-site); omit for the default site. */
  siteKey?: string;
};

/** Result of resolving a request to a Site row (legacy helper; prefer `req.site`). */
export type ResolvedSite = {
  siteId: string;
  /** Site.slug — internal key used in the database. */
  siteInternalSlug: string;
  lang: Lang;
  /** Public SiteKey.slug for multi-site URLs when applicable. */
  canonicalSiteKey?: string;
  /** True when the requested key redirects to a different canonical SiteKey. */
  redirected: boolean;
};

/**
 * Legacy site resolution by lang + optional siteKey.
 * Prefer {@link SiteResolveMiddleware} / `req.site` for new HTTP handlers.
 */
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
   * Resolve a Site from lang + optional public siteKey.
   * - No / empty / `"default"` siteKey → default Site.slug (`DEFAULT_SITE_SLUG`)
   * - Otherwise → SiteKey lookup (primary first), with Site.slug fallback
   *
   * Supports single-site (implicit) and multi-site (explicit public slug) modes.
   *
   * @deprecated Prefer SiteResolveMiddleware and `req.site`
   */
  async resolve(args: ResolveSiteArgs): Promise<ResolvedSite> {
    const lang = this.normalizeLang(args.lang);
    const siteKey = normalizePublicSiteKey(args.siteKey);

    // Single-site / implicit site: use default Site.slug (internal key)
    // Also treats path segment "default" like omitting siteKey (platform-settings convention).
    if (!siteKey) {
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
        slug: siteKey,
        isActive: true,
      },
      orderBy: [
        { isPrimary: "desc" }, // Primary keys first
        { createdAt: "asc" }, // Then by creation date (oldest first)
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
        where: { slug: siteKey },
        select: { id: true, slug: true },
      });

      if (site) {
        // Site exists but no SiteKey entry for this language - use site as-is
        return {
          siteId: site.id,
          siteInternalSlug: site.slug,
          lang,
          canonicalSiteKey: siteKey,
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
        if (!site) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);

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
      if (!site) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);

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
    if (!site) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);

    return {
      siteId: site.id,
      siteInternalSlug: site.slug,
      lang,
      canonicalSiteKey: hit.slug,
      redirected: false,
    };
  }
}

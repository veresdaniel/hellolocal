// src/common/middleware/site-resolve.middleware.ts
import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { Lang } from "../language-code";
import { requireLang } from "../lang";

/**
 * Site context attached to every request.
 * This is the canonical flow for Site resolution.
 */
export type SiteCtx = {
  siteId: string; // Site.id (Site ID)
  canonicalKey: string | null; // Canonical siteKey (SiteKey.slug)
  redirected: boolean; // Whether the request was redirected to a canonical siteKey
  lang: Lang;
};

/**
 * Extended Request interface to include site context.
 */
export interface RequestWithSite extends Request {
  site?: SiteCtx;
}

/**
 * Site resolve middleware (canonical flow).
 *
 * HTTP request → /:lang/:siteKey/*
 *
 * Resolve lépések:
 * 1. siteKey + lang → SiteKey (SiteKey table lookup)
 * 2. If redirect → 301 redirect to canonical URL
 * 3. SiteKey.siteId → Site (Site table)
 * 4. Attach: req.site = { siteId, canonicalKey, redirected, lang }
 *
 * This middleware is the core of the Site-based architecture.
 */
@Injectable()
export class SiteResolveMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteResolveMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: RequestWithSite, res: Response, next: NextFunction) {
    try {
      // Priority 1: Domain-based resolution (highest priority)
      // SiteDomain first, then Town.customDomain / Place.customDomain → parent Site
      const host = this.normalizeHost(req.headers.host);
      if (host && !this.isLocalhostOrIp(host)) {
        const resolved = await this.resolveHostToSite(host);
        if (resolved) {
          const langParam = (req.params as any)?.lang;
          const lang: Lang = langParam ? requireLang(langParam) : resolved.defaultLang;

          const siteInstance = await this.prisma.siteInstance.findUnique({
            where: {
              siteId_lang: {
                siteId: resolved.siteId,
                lang,
              },
            },
          });

          req.site = {
            siteId: resolved.siteId,
            canonicalKey: resolved.slug,
            redirected: false,
            lang,
          };

          this.logger.debug(
            `Domain-based site resolved (${resolved.source}): ${host} → siteId=${resolved.siteId}, slug=${resolved.slug}, lang=${lang}`
          );
          if (!siteInstance) {
            this.logger.warn(
              `Host ${host} has no SiteInstance for lang=${lang}; the slug ${resolved.slug} stays the fallback`
            );
          }
          return next();
        }
      }

      // Priority 2: URL-based resolution (/:lang/:siteKey/*)
      // Extract lang and siteKey from URL params
      // Support both 'siteKey' and 'tenantKey' parameter names (for backward compatibility)
      const langParam = (req.params as any)?.lang;
      const siteKeyParam = (req.params as any)?.siteKey || (req.params as any)?.tenantKey;

      // If no lang or siteKey in path, skip site resolution
      // (this might be a non-API route or a route that doesn't need site resolution)
      if (!langParam || !siteKeyParam) {
        return next();
      }

      const lang = requireLang(langParam);
      const siteKey = siteKeyParam.trim();

      this.logger.debug(
        `Attempting site resolution: lang=${lang}, siteKey=${siteKey}, path=${req.path}`
      );

      // Step 1: siteKey + lang → SiteKey (SiteKey table lookup)
      // Note: Since unique constraint is now [siteId, lang, slug], we use findFirst
      // and prioritize isPrimary=true entries
      const siteKeyRecord = await this.prisma.siteKey.findFirst({
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
          siteId: true, // This is the siteId
          slug: true,
          isActive: true,
          isPrimary: true,
          redirectToId: true,
          redirectTo: {
            select: {
              slug: true,
              isActive: true,
            },
          },
        },
      });

      if (!siteKeyRecord) {
        this.logger.warn(
          `SiteKey not found: lang=${lang}, siteKey=${siteKey}. Checking for Site.slug fallback...`
        );
      }

      // If SiteKey not found, try fallback to Site.slug (for backward compatibility)
      if (!siteKeyRecord || !siteKeyRecord.isActive) {
        const site = await this.prisma.site.findUnique({
          where: { slug: siteKey },
          select: { id: true, slug: true, isActive: true },
        });

        if (site && site.isActive) {
          // Site exists but no SiteKey entry for this language - use site as-is
          req.site = {
            siteId: site.id,
            canonicalKey: site.slug,
            redirected: false,
            lang,
          };

          this.logger.debug(
            `Site resolved (fallback to Site.slug): ${siteKey} → siteId=${site.id}, lang=${lang}`
          );
          return next();
        }

        // Log detailed error for debugging
        this.logger.error(
          `Site resolution failed: lang=${lang}, siteKey=${siteKey}, path=${req.path}`
        );
        this.logger.error(
          `  - SiteKey lookup: ${siteKeyRecord ? "found but inactive" : "not found"}`
        );
        this.logger.error(
          `  - Site.slug fallback: ${site ? (site.isActive ? "found but inactive" : "found but not active") : "not found"}`
        );

        throw new NotFoundException(`Site key not found: ${siteKey} for lang: ${lang}`);
      }

      // Step 2: Handle redirects (if redirectToId exists and target is active)
      if (siteKeyRecord.redirectToId && siteKeyRecord.redirectTo?.isActive) {
        const canonicalKey = siteKeyRecord.redirectTo.slug;
        const canonicalUrl = this.buildCanonicalUrl(req, lang, canonicalKey);

        this.logger.debug(`Site redirect: ${siteKey} → ${canonicalKey} (301 redirect)`);

        // Step 2a: 301 redirect to canonical URL
        return res.redirect(301, canonicalUrl);
      }

      // Step 3: If not primary, find the primary siteKey for this site
      let canonicalKey = siteKeyRecord.slug;
      let redirected = false;

      if (!siteKeyRecord.isPrimary) {
        const primarySiteKey = await this.prisma.siteKey.findFirst({
          where: {
            siteId: siteKeyRecord.siteId,
            lang,
            isPrimary: true,
            isActive: true,
          },
          select: { slug: true },
        });

        if (primarySiteKey) {
          canonicalKey = primarySiteKey.slug;
          redirected = true;

          // If the current siteKey is not the canonical one, redirect
          if (siteKey !== canonicalKey) {
            const canonicalUrl = this.buildCanonicalUrl(req, lang, canonicalKey);

            this.logger.debug(
              `Site redirect (non-primary): ${siteKey} → ${canonicalKey} (301 redirect)`
            );

            return res.redirect(301, canonicalUrl);
          }
        }
      }

      // Step 4: Verify Site exists and is active
      const site = await this.prisma.site.findUnique({
        where: { id: siteKeyRecord.siteId },
        select: { id: true, slug: true, isActive: true },
      });

      if (!site || !site.isActive) {
        this.logger.error(
          `Site verification failed: siteId=${siteKeyRecord.siteId}, siteKey=${siteKey}, lang=${lang}`
        );
        this.logger.error(
          `  - Site exists: ${site ? "yes" : "no"}, isActive: ${site?.isActive ?? "N/A"}`
        );
        throw new NotFoundException(`Site not found or inactive: siteId=${siteKeyRecord.siteId}`);
      }

      // Step 5: Attach site context to request
      req.site = {
        siteId: site.id,
        canonicalKey,
        redirected,
        lang,
      };

      this.logger.debug(
        `Site resolved: ${siteKey} → siteId=${site.id}, canonicalKey=${canonicalKey}, lang=${lang}, redirected=${redirected}`
      );

      return next();
    } catch (err) {
      // If it's already an HTTP exception, pass it through
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        return next(err);
      }

      // Log unexpected errors but continue (let other middleware/guards handle it)
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error in site resolve middleware: ${errorMessage}`,
        err instanceof Error ? err.stack : undefined
      );
      return next(err);
    }
  }

  /**
   * Resolve hostname → parent Site via SiteDomain (primary + subdomains),
   * Site.primaryDomain fallback, Town.customDomain, or Place.customDomain.
   * Standalone towns (no siteId) cannot provide site context and are skipped.
   */
  private async resolveHostToSite(host: string): Promise<{
    siteId: string;
    slug: string;
    defaultLang: Lang;
    source: "site" | "town" | "place";
  } | null> {
    const siteDomain = await this.prisma.siteDomain.findUnique({
      where: { domain: host },
      select: {
        siteId: true,
        defaultLang: true,
        isActive: true,
        site: { select: { id: true, slug: true, isActive: true } },
      },
    });
    if (siteDomain?.isActive && siteDomain.site?.isActive) {
      return {
        siteId: siteDomain.siteId,
        slug: siteDomain.site.slug,
        defaultLang: siteDomain.defaultLang as Lang,
        source: "site",
      };
    }

    const siteByPrimary = await this.prisma.site.findFirst({
      where: { primaryDomain: host, isActive: true },
      select: { id: true, slug: true, languages: true },
    });
    if (siteByPrimary) {
      return {
        siteId: siteByPrimary.id,
        slug: siteByPrimary.slug,
        defaultLang: (siteByPrimary.languages?.[0] || "hu") as Lang,
        source: "site",
      };
    }

    const town = await this.prisma.town.findUnique({
      where: { customDomain: host },
      select: {
        isActive: true,
        site: { select: { id: true, slug: true, isActive: true, languages: true } },
      },
    });
    if (town?.isActive && town.site?.isActive) {
      return {
        siteId: town.site.id,
        slug: town.site.slug,
        defaultLang: (town.site.languages?.[0] || "hu") as Lang,
        source: "town",
      };
    }

    const place = await this.prisma.place.findUnique({
      where: { customDomain: host },
      select: {
        isActive: true,
        site: { select: { id: true, slug: true, isActive: true, languages: true } },
      },
    });
    if (place?.isActive && place.site?.isActive) {
      return {
        siteId: place.site.id,
        slug: place.site.slug,
        defaultLang: (place.site.languages?.[0] || "hu") as Lang,
        source: "place",
      };
    }

    return null;
  }

  /**
   * Build canonical URL for redirects.
   * Preserves the original path structure but replaces siteKey with canonicalKey.
   *
   * Handles both patterns:
   * - /api/public/:lang/:siteKey/...
   * - /:lang/:siteKey/...
   */
  private buildCanonicalUrl(req: RequestWithSite, lang: Lang, canonicalKey: string): string {
    const originalPath = req.path;
    const siteKeyParam = (req.params as any)?.siteKey || (req.params as any)?.tenantKey;

    if (!siteKeyParam) {
      // Fallback: just return the path with canonical key
      return originalPath.replace(`/${lang}/`, `/${lang}/${canonicalKey}/`);
    }

    // Replace siteKey with canonicalKey in the path
    // Handle both /:lang/:siteKey/ and /api/public/:lang/:siteKey/ patterns
    let canonicalPath = originalPath;

    // Pattern 1: /api/public/:lang/:siteKey/...
    if (originalPath.includes(`/api/public/${lang}/${siteKeyParam}/`)) {
      canonicalPath = originalPath.replace(
        `/api/public/${lang}/${siteKeyParam}/`,
        `/api/public/${lang}/${canonicalKey}/`
      );
    }
    // Pattern 2: /:lang/:siteKey/...
    else if (originalPath.includes(`/${lang}/${siteKeyParam}/`)) {
      canonicalPath = originalPath.replace(
        `/${lang}/${siteKeyParam}/`,
        `/${lang}/${canonicalKey}/`
      );
    }
    // Pattern 3: /:lang/:siteKey (end of path, no trailing slash)
    else if (originalPath.endsWith(`/${lang}/${siteKeyParam}`)) {
      canonicalPath = originalPath.replace(`/${lang}/${siteKeyParam}`, `/${lang}/${canonicalKey}`);
    }
    // Pattern 4: /api/public/:lang/:siteKey (end of path, no trailing slash)
    else if (originalPath.endsWith(`/api/public/${lang}/${siteKeyParam}`)) {
      canonicalPath = originalPath.replace(
        `/api/public/${lang}/${siteKeyParam}`,
        `/api/public/${lang}/${canonicalKey}`
      );
    }

    // Preserve query string if present
    const queryString = req.url.includes("?") ? req.url.split("?")[1] : "";
    return canonicalPath + (queryString ? `?${queryString}` : "");
  }

  /**
   * Normalize host header (remove port, handle proxy headers, lowercase)
   */
  private normalizeHost(hostHeader?: string | string[]): string | null {
    if (!hostHeader) return null;

    // Handle array (from x-forwarded-host in some proxies)
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

    // host may include port: "etyek.local:5173"
    const noComma = host.split(",")[0].trim(); // in case of proxies
    const noPort = noComma.replace(/:\d+$/, "");
    return noPort.toLowerCase();
  }

  /**
   * Check if domain is localhost or IP address.
   *
   * Best practice: Only skip resolution for actual localhost/IP.
   * Custom domains in hosts file (e.g., etyek.localo.test) should work.
   */
  private isLocalhostOrIp(domain: string): boolean {
    if (!domain) return true;

    // Check for exact localhost variants (but allow custom domains like "etyek.local")
    if (domain === "localhost") {
      return true;
    }

    // Check for localhost with subdomain (localhost.*) - skip these
    if (domain.startsWith("localhost.")) {
      return true;
    }

    // Check for IP address (IPv4 or IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    if (ipv4Regex.test(domain) || ipv6Regex.test(domain)) {
      return true;
    }

    // Allow custom domains (e.g., etyek.localo.test, budai.local, etc.)
    // These should work if configured in hosts file and SiteInstance table
    return false;
  }
}

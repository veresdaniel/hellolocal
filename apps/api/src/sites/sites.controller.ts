import { Controller, Get, Post, Param, Query, Body, BadRequestException, UseGuards, NotFoundException, ConflictException } from "@nestjs/common";
import { SitesService } from "./sites.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { SiteResolverService } from "../site/site-resolver.service";

/**
 * Controller for site-related public endpoints.
 * 
 * Routes:
 * - GET /api/:lang/sites - List active sites with optional filtering
 * - GET /api/:lang/sites/:slug - Get a single site by slug
 * 
 * All endpoints support multi-site mode via the optional siteKey query parameter.
 */
@Controller("/api/:lang/sites")
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly siteResolver: SiteResolverService
  ) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Lists active sites with optional filtering.
   * 
   * Query parameters:
   * - siteKey: Optional site key for multi-site support (not used for filtering, just for consistency)
   * - q: Search query (searches in site names)
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("siteKey") siteKey?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    this.validateLang(lang);
    return this.sitesService.list({
      lang,
      siteKey,
      q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single site by its slug.
   * 
   * Query parameters:
   * - siteKey: Optional site key for multi-site support (not used, just for consistency)
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - slug: Site slug
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("siteKey") siteKey?: string
  ) {
    this.validateLang(lang);
    return this.sitesService.detail({ lang, siteKey, slug });
  }

  /**
   * Activates a free site plan for a visitor user.
   * This endpoint allows visitors (users with activeSiteId === null) to activate their free site.
   * 
   * Requirements:
   * - User must be authenticated
   * - User must be a visitor (activeSiteId === null)
   * 
   * Actions:
   * - If siteKey is provided, uses that site (the one the user is currently viewing)
   * - Otherwise, uses the first assigned site or default site
   * - Sets the user's activeSiteId to the selected site
   * - Creates a SiteSubscription with BASIC plan if it doesn't exist
   */
  @Post("activate-free")
  @UseGuards(JwtAuthGuard)
  async activateFree(
    @Param("lang") lang: string,
    @Body() body: { siteKey?: string },
    @CurrentUser() user: { id: string; activeSiteId: string | null; role: string }
  ) {
    this.validateLang(lang);

    // Check if user is already active (not a visitor)
    if (user.activeSiteId !== null) {
      throw new ConflictException("User already has an active site. Cannot activate free plan.");
    }

    let targetSiteId: string | null = null;
    let targetSiteSlug: string | null = null;

    // If siteKey is provided, resolve it to a siteId
    if (body.siteKey) {
      try {
        console.log(`[activate-free] Resolving siteKey: ${body.siteKey} for lang: ${lang}`);
        const resolved = await this.siteResolver.resolveSite({ lang, siteKey: body.siteKey });
        targetSiteId = resolved.siteId;
        console.log(`[activate-free] Resolved siteKey ${body.siteKey} to siteId: ${targetSiteId}`);
        
        // Get site slug for response
        const site = await this.prisma.site.findUnique({
          where: { id: targetSiteId },
          select: { slug: true },
        });
        targetSiteSlug = site?.slug || null;
      } catch (error) {
        // If siteKey resolution fails, fall through to default logic
        console.warn(`[activate-free] Failed to resolve siteKey ${body.siteKey}:`, error);
        console.warn(`[activate-free] Falling back to default logic`);
      }
    } else {
      console.log(`[activate-free] No siteKey provided in request body`);
    }

    // If no siteKey provided or resolution failed, use user's existing sites or default
    if (!targetSiteId) {
      // Get user's sites
      const userSites = await this.prisma.userSite.findMany({
        where: { userId: user.id },
        include: {
          site: {
            select: {
              id: true,
              slug: true,
              isActive: true,
            },
          },
        },
        orderBy: { isPrimary: "desc" }, // Primary site first
      });

      if (userSites.length > 0) {
        // User has sites, use the first one (preferably primary)
        targetSiteId = userSites[0].site.id;
        targetSiteSlug = userSites[0].site.slug;
      } else {
        // User has no sites, use default site
        const defaultSiteSlug = this.configService.get<string>("DEFAULT_SITE_SLUG") ?? "etyek-budai";
        const defaultSite = await this.prisma.site.findUnique({
          where: { slug: defaultSiteSlug },
        });

        if (!defaultSite) {
          throw new NotFoundException("Default site not found. Please contact support.");
        }

        targetSiteId = defaultSite.id;
        targetSiteSlug = defaultSite.slug;

        // Assign user to default site
        await this.prisma.userSite.create({
          data: {
            userId: user.id,
            siteId: defaultSite.id,
            isPrimary: true,
          },
        });
      }
    } else {
      // Site was resolved from siteKey, ensure user is assigned to it
      const existingUserSite = await this.prisma.userSite.findUnique({
        where: {
          userId_siteId: {
            userId: user.id,
            siteId: targetSiteId,
          },
        },
      });

      if (!existingUserSite) {
        // Assign user to the site
        await this.prisma.userSite.create({
          data: {
            userId: user.id,
            siteId: targetSiteId,
            isPrimary: true, // Make it primary since user activated it
          },
        });
      }
    }

    // Set activeSiteId to the target site
    await this.prisma.user.update({
      where: { id: user.id },
      data: { activeSiteId: targetSiteId },
    });

    // Create SiteSubscription with BASIC plan if it doesn't exist
    await this.prisma.siteSubscription.upsert({
      where: { siteId: targetSiteId },
      create: {
        siteId: targetSiteId,
        plan: "BASIC",
        status: "ACTIVE",
        validUntil: null,
      },
      update: {
        plan: "BASIC",
        status: "ACTIVE",
      },
    });

    return {
      siteId: targetSiteId,
      slug: targetSiteSlug || "",
      message: "Free site activated successfully",
    };
  }
}

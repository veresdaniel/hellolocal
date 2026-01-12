import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { SitesService } from "./sites.service";

/**
 * Public controller for site-related endpoints.
 * 
 * Routes:
 * - GET /api/public/:lang/:siteKey/sites - List active sites with optional filtering
 * - GET /api/public/:lang/:siteKey/sites/:slug - Get a single site by slug
 * 
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/sites")
export class SitesPublicController {
  constructor(private readonly sitesService: SitesService) {}

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
   * - q: Search query (searches in site names)
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
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
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - slug: Site slug
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("slug") slug: string
  ) {
    this.validateLang(lang);
    return this.sitesService.detail({ lang, siteKey, slug });
  }
}

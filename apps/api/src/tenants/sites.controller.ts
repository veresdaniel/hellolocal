import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { SitesService } from "./sites.service";

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
}

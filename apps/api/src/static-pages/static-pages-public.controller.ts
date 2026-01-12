import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { StaticPagesService } from "./static-pages.service";

/**
 * Public controller for static page endpoints.
 * 
 * Routes:
 * - GET /api/public/:lang/:siteKey/static-pages - List static pages with optional category filtering
 * - GET /api/public/:lang/:siteKey/static-pages/:id - Get a single static page by ID
 * 
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/static-pages")
export class StaticPagesPublicController {
  constructor(private readonly staticPagesService: StaticPagesService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Lists static pages with optional category filtering.
   * 
   * Query parameters:
   * - category: Optional category filter (blog, tudastar, infok)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Query("category") category?: string
  ) {
    this.validateLang(lang);
    return this.staticPagesService.list({ lang, siteKey, category });
  }

  /**
   * Gets a single static page by ID.
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - id: Static page ID
   */
  @Get("/:id")
  detail(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("id") id: string
  ) {
    this.validateLang(lang);
    return this.staticPagesService.detail({ lang, siteKey, id });
  }

  /**
   * Gets a single static page by ID (stable, future-proof).
   * 
   * This endpoint follows the by-id pattern for consistency.
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - id: Static page ID
   */
  @Get("by-id/:id")
  detailById(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("id") id: string
  ) {
    this.validateLang(lang);
    return this.staticPagesService.detail({ lang, siteKey, id });
  }
}

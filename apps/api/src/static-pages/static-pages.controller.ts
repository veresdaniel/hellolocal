import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { StaticPagesService } from "./static-pages.service";

/**
 * Controller for static page endpoints.
 *
 * Routes:
 * - GET /api/:lang/static-pages - List static pages with optional category filtering
 * - GET /api/:lang/static-pages/:id - Get a single static page by ID
 *
 * All endpoints support multi-site mode via the optional siteKey query parameter.
 */
@Controller("/api/:lang/static-pages")
export class StaticPagesController {
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
   * - siteKey: Optional site key for multi-site support
   * - category: Optional category filter (blog, tudastar, infok)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("siteKey") siteKey?: string,
    @Query("category") category?: string
  ) {
    this.validateLang(lang);
    return this.staticPagesService.list({ lang, siteKey, category });
  }

  /**
   * Gets a single static page by ID.
   */
  @Get("/:id")
  detail(@Param("lang") lang: string, @Param("id") id: string, @Query("siteKey") siteKey?: string) {
    this.validateLang(lang);
    return this.staticPagesService.detail({ lang, siteKey, id });
  }
}

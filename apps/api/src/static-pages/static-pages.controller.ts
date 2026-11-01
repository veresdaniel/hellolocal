import { Controller, Get, Param, Query } from "@nestjs/common";
import { StaticPagesService } from "./static-pages.service";
import { assertLang } from "../common/lang";

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
    assertLang(lang);
    return this.staticPagesService.list({ lang, siteKey, category });
  }

  /**
   * Gets a single static page by ID.
   */
  @Get("/:id")
  detail(@Param("lang") lang: string, @Param("id") id: string, @Query("siteKey") siteKey?: string) {
    assertLang(lang);
    return this.staticPagesService.detail({ lang, siteKey, id });
  }
}

import { Controller, Get, Param, Query } from "@nestjs/common";
import { LegalService } from "./legal.service";
import { assertLang } from "../common/lang";

/**
 * Controller for legal page endpoints.
 *
 * Routes:
 * - GET /api/:lang/legal/:page - Get a legal page (imprint, terms, or privacy)
 *
 * All endpoints support multi-site mode via the optional siteKey query parameter.
 */
@Controller("/api/:lang/legal")
export class LegalController {
  constructor(private readonly legal: LegalService) {}


  /**
   * Gets a legal page by key.
   *
   * Query parameters:
   * - siteKey: Optional site key for multi-site support
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - page: Page key (imprint, terms, privacy)
   */
  @Get("/:page")
  getLegalPage(
    @Param("lang") lang: string,
    @Param("page") page: string,
    @Query("siteKey") siteKey?: string
  ) {
    assertLang(lang);
    return this.legal.getPage({ lang, page, siteKey });
  }
}

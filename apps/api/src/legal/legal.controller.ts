import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { LegalService } from "./legal.service";

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
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

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
    this.validateLang(lang);
    return this.legal.getPage({ lang, page, siteKey });
  }
}

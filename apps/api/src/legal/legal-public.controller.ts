import { Controller, Get, Param, BadRequestException } from "@nestjs/common";
import { LegalService } from "./legal.service";

/**
 * Public controller for legal page endpoints.
 *
 * Routes:
 * - GET /api/public/:lang/:siteKey/legal/:page - Get a legal page (imprint, terms, or privacy)
 *
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/legal")
export class LegalPublicController {
  constructor(private readonly legalService: LegalService) {}

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
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - page: Page key (imprint, terms, privacy)
   */
  @Get("/:page")
  getLegalPage(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("page") page: string
  ) {
    this.validateLang(lang);
    return this.legalService.getPage({ lang, siteKey, page });
  }

  /**
   * Gets a legal page by entity ID (stable, future-proof).
   *
   * For legal pages, the entityId is the page key (imprint, terms, privacy).
   * This endpoint follows the by-id pattern for consistency.
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - pageId: Page key (imprint, terms, privacy) - acts as entityId
   */
  @Get("by-id/:pageId")
  getLegalPageById(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("pageId") pageId: string
  ) {
    this.validateLang(lang);
    return this.legalService.getPage({ lang, siteKey, page: pageId });
  }
}

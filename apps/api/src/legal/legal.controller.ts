import { Controller, Get, Param, Query } from "@nestjs/common";
import { LegalService } from "./legal.service";

/**
 * Controller for legal page endpoints.
 * 
 * Routes:
 * - GET /api/:lang/legal/:page - Get a legal page (imprint, terms, or privacy)
 * 
 * All endpoints support multi-tenant mode via the optional tenantKey query parameter.
 */
@Controller("/api/:lang/legal")
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  /**
   * Gets a legal page by key.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - page: Page key (imprint, terms, privacy)
   */
  @Get("/:page")
  getLegalPage(
    @Param("lang") lang: string,
    @Param("page") page: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    return this.legal.getPage({ lang, page, tenantKey });
  }
}

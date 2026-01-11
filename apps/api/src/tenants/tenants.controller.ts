import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { TenantsService } from "./tenants.service";

/**
 * Controller for tenant-related public endpoints.
 * 
 * Routes:
 * - GET /api/:lang/tenants - List active tenants with optional filtering
 * - GET /api/:lang/tenants/:slug - Get a single tenant by slug
 * 
 * All endpoints support multi-tenant mode via the optional tenantKey query parameter.
 */
@Controller("/api/:lang/tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Lists active tenants with optional filtering.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support (not used for filtering, just for consistency)
   * - q: Search query (searches in tenant names)
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    this.validateLang(lang);
    return this.tenantsService.list({
      lang,
      tenantKey,
      q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single tenant by its slug.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support (not used, just for consistency)
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - slug: Tenant slug
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    this.validateLang(lang);
    return this.tenantsService.detail({ lang, tenantKey, slug });
  }
}

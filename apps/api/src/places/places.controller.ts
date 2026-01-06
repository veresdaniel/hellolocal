import { Controller, Get, Param, Query } from "@nestjs/common";
import { PlacesService } from "./places.service";

/**
 * Controller for place-related endpoints.
 * 
 * Routes:
 * - GET /api/:lang/places - List places with optional filtering
 * - GET /api/:lang/places/:slug - Get a single place by slug
 * 
 * All endpoints support multi-tenant mode via the optional tenantKey query parameter.
 */
@Controller("/api/:lang/places")
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  /**
   * Lists places with optional filtering.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support
   * - category: Filter by place category (winery, accommodation, etc.)
   * - town: Filter by town using public town slug
   * - q: Search query (searches in place names)
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string,
    @Query("category") category?: string,
    @Query("town") town?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.placesService.list({
      lang,
      tenantKey,
      category,
      town,
      q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single place by its public slug.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - slug: Public-facing slug of the place
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    return this.placesService.detail({ lang, tenantKey, slug });
  }
}

import { Controller, Get, Param, Query } from "@nestjs/common";
import { PlacesService } from "./places.service";
import { assertLang } from "../common/lang";

/**
 * Controller for place-related endpoints.
 *
 * Routes:
 * - GET /api/:lang/places - List places with optional filtering
 * - GET /api/:lang/places/:slug - Get a single place by slug
 *
 * All endpoints support multi-site mode via the optional siteKey query parameter.
 */
@Controller("/api/:lang/places")
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}


  /**
   * Lists places with optional filtering.
   *
   * Query parameters:
   * - siteKey: Optional site key for multi-site support
   * - category: Filter by place category (winery, accommodation, etc.)
   * - priceBand: Filter by price band name
   * - town: Filter by town using public town slug
   * - q: Search query (searches in place names)
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("siteKey") siteKey?: string,
    @Query("category") category?: string | string[],
    @Query("priceBand") priceBand?: string | string[],
    @Query("town") town?: string,
    @Query("q") q?: string,
    @Query("kind") kind?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    assertLang(lang);
    // Normalize category and priceBand to arrays
    const categories = Array.isArray(category) ? category : category ? [category] : undefined;
    const priceBands = Array.isArray(priceBand) ? priceBand : priceBand ? [priceBand] : undefined;
    return this.placesService.list({
      lang,
      siteKey,
      category: categories,
      priceBand: priceBands,
      town,
      q,
      kind: kind === "service" || kind === "all" ? kind : "place",
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single place by its public slug.
   *
   * Query parameters:
   * - siteKey: Optional site key for multi-site support
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - slug: Public-facing slug of the place
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("siteKey") siteKey?: string
  ) {
    assertLang(lang);
    return this.placesService.detail({ lang, siteKey, slug });
  }
}

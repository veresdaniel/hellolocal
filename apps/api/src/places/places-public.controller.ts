import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PlacesService } from "./places.service";
import { PlacesPriceListService } from "./places-price-list.service";
import { AdminFloorplanService } from "../admin/admin-floorplan.service";

/**
 * Public controller for place-related endpoints.
 *
 * Routes:
 * - GET /api/public/:lang/:siteKey/places - List places with optional filtering
 * - GET /api/public/:lang/:siteKey/places/:slug - Get a single place by slug
 * - GET /api/public/:lang/:siteKey/places/by-id/:placeId - Get a single place by ID (stable)
 *
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/places")
export class PlacesPublicController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly priceListService: PlacesPriceListService,
    private readonly floorplanService: AdminFloorplanService
  ) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Lists places with optional filtering.
   *
   * Query parameters:
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
    @Param("siteKey") siteKey: string,
    @Query("category") category?: string | string[],
    @Query("priceBand") priceBand?: string | string[],
    @Query("town") town?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    this.validateLang(lang);
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
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single place by its public slug.
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - slug: Public-facing slug of the place
   */
  @Get(":slug")
  async detail(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("slug") slug: string
  ) {
    this.validateLang(lang);
    const place = await this.placesService.detail({ lang, siteKey, slug });
    // Add hasPriceList flag
    const site = await this.placesService["siteResolver"].resolve({ lang, siteKey });
    const hasPriceList = await this.priceListService.hasPriceList(place.id, site.siteId);
    return {
      ...place,
      hasPriceList,
    };
  }

  /**
   * Gets a single place by its entity ID (stable, future-proof).
   *
   * This endpoint should be used after slug resolution to fetch place data by ID.
   * The slug is only used for UI/SEO purposes, but data loading always uses stable IDs.
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - placeId: Place entity ID
   */
  @Get("by-id/:placeId")
  async detailById(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("placeId") placeId: string
  ) {
    this.validateLang(lang);
    const place = await this.placesService.detailById({ lang, siteKey, placeId });
    // Add hasPriceList flag
    const site = await this.placesService["siteResolver"].resolve({ lang, siteKey });
    const hasPriceList = await this.priceListService.hasPriceList(placeId, site.siteId);
    return {
      ...place,
      hasPriceList,
    };
  }

  /**
   * Gets price list for a place (public)
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - placeId: Place entity ID
   */
  @Get("by-id/:placeId/pricelist")
  async getPriceList(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("placeId") placeId: string
  ) {
    this.validateLang(lang);
    const site = await this.placesService["siteResolver"].resolve({ lang, siteKey });
    // For public endpoint, requireAuth is false (no authentication check)
    return this.priceListService.getPriceList(placeId, site.siteId, false);
  }

  /**
   * Gets all floorplans for a place (public, read-only)
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - placeId: Place entity ID
   */
  @Get("by-id/:placeId/floorplans")
  async getFloorplans(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("placeId") placeId: string
  ) {
    this.validateLang(lang);
    const site = await this.placesService["siteResolver"].resolve({ lang, siteKey });

    // Verify place belongs to site
    const place = await this.placesService.detailById({ lang, siteKey, placeId });
    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Get all floorplans for the place (public read-only, no auth required)
    return this.floorplanService.findAll(placeId, "public-read");
  }

  /**
   * Gets a floorplan with pins for a place (public, read-only)
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - placeId: Place entity ID
   * - floorplanId: Floorplan entity ID
   */
  @Get("by-id/:placeId/floorplans/:floorplanId")
  async getFloorplan(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("placeId") placeId: string,
    @Param("floorplanId") floorplanId: string
  ) {
    this.validateLang(lang);
    const site = await this.placesService["siteResolver"].resolve({ lang, siteKey });

    // Verify place belongs to site
    const place = await this.placesService.detailById({ lang, siteKey, placeId });
    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Get floorplan (public read-only, no auth required)
    const floorplan = await this.floorplanService.findOne(floorplanId, "public-read");

    // Verify floorplan belongs to the place
    if (floorplan.placeId !== placeId) {
      throw new NotFoundException("Floorplan not found for this place");
    }

    return floorplan;
  }
}

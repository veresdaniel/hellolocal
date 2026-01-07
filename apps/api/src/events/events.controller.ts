import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { EventsService } from "./events.service";

/**
 * Controller for event-related endpoints.
 * 
 * Routes:
 * - GET /api/:lang/events - List events with optional filtering
 * - GET /api/:lang/events/:slug - Get a single event by slug
 * 
 * All endpoints support multi-tenant mode via the optional tenantKey query parameter.
 */
@Controller("/api/:lang/events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Lists events with optional filtering.
   * 
   * Query parameters:
   * - tenantKey: Optional tenant key for multi-tenant support
   * - category: Filter by event category
   * - placeId: Filter by place ID
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  list(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string,
    @Query("category") category?: string,
    @Query("placeId") placeId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    this.validateLang(lang);
    return this.eventsService.list({
      lang,
      tenantKey,
      category,
      placeId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  /**
   * Gets a single event by its public slug.
   */
  @Get("/:slug")
  detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    this.validateLang(lang);
    return this.eventsService.detail({ lang, tenantKey, slug });
  }
}


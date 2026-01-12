import { Controller, Get, Param, Query, BadRequestException, Logger } from "@nestjs/common";
import { EventsService } from "./events.service";

/**
 * Public controller for event-related endpoints.
 * 
 * Routes:
 * - GET /api/public/:lang/:siteKey/events - List events with optional filtering
 * - GET /api/public/:lang/:siteKey/events/:slug - Get a single event by slug
 * - GET /api/public/:lang/:siteKey/events/by-id/:eventId - Get a single event by ID (stable)
 * 
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/events")
export class EventsPublicController {
  private readonly logger = new Logger(EventsPublicController.name);

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
   * - category: Filter by event category
   * - placeId: Filter by place ID
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  async list(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Query("category") category?: string,
    @Query("placeId") placeId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    try {
      this.validateLang(lang);
      return await this.eventsService.list({
        lang,
        siteKey,
        category,
        placeId,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });
    } catch (error) {
      this.logger.error(
        `Error listing events: lang=${lang}, siteKey=${siteKey}`,
        error instanceof Error ? error.stack : JSON.stringify(error)
      );
      throw error;
    }
  }

  /**
   * Gets a single event by its public slug.
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - slug: Public-facing slug of the event
   */
  @Get(":slug")
  async detail(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("slug") slug: string
  ) {
    try {
      this.validateLang(lang);
      return await this.eventsService.detail({ lang, siteKey, slug });
    } catch (error) {
      this.logger.error(
        `Error getting event detail: lang=${lang}, slug=${slug}, siteKey=${siteKey}`,
        error instanceof Error ? error.stack : JSON.stringify(error)
      );
      throw error;
    }
  }

  /**
   * Gets a single event by its entity ID (stable, future-proof).
   * 
   * This endpoint should be used after slug resolution to fetch event data by ID.
   * The slug is only used for UI/SEO purposes, but data loading always uses stable IDs.
   * 
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - eventId: Event entity ID
   */
  @Get("by-id/:eventId")
  async detailById(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("eventId") eventId: string
  ) {
    try {
      this.validateLang(lang);
      return await this.eventsService.detailById({ lang, siteKey, eventId });
    } catch (error) {
      this.logger.error(
        `Error getting event by ID: lang=${lang}, eventId=${eventId}, siteKey=${siteKey}`,
        error instanceof Error ? error.stack : JSON.stringify(error)
      );
      throw error;
    }
  }
}

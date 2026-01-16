import { Controller, Get, Param, Query, BadRequestException, Logger } from "@nestjs/common";
import { EventsService } from "./events.service";

/**
 * Controller for event-related endpoints.
 *
 * Routes:
 * - GET /api/:lang/events - List events with optional filtering
 * - GET /api/:lang/events/:slug - Get a single event by slug
 *
 * All endpoints support multi-site mode via the optional siteKey query parameter.
 */
@Controller("/api/:lang/events")
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

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
   * - siteKey: Optional site key for multi-site support
   * - category: Filter by event category
   * - placeId: Filter by place ID
   * - limit: Maximum number of results (default: 50, max: 200)
   * - offset: Pagination offset (default: 0)
   */
  @Get()
  async list(
    @Param("lang") lang: string,
    @Query("siteKey") siteKey?: string,
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
   */
  @Get("/:slug")
  async detail(
    @Param("lang") lang: string,
    @Param("slug") slug: string,
    @Query("siteKey") siteKey?: string
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
}

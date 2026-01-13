import { Controller, Post, Get, Param, Body, BadRequestException, UseGuards } from "@nestjs/common";
import { EventRatingService } from "./event-rating.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface CreateEventRatingDto {
  value: number;
}

@Controller("/api/:lang/events/:eventId/rating")
@UseGuards(JwtAuthGuard)
export class EventRatingController {
  constructor(private readonly eventRatingService: EventRatingService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Creates or updates a rating for an event.
   * Requires authentication.
   * 
   * Body: { value: 1..5 }
   * Returns: { eventId, userId, value, ratingAvg, ratingCount }
   */
  @Post()
  async createOrUpdateRating(
    @Param("lang") lang: string,
    @Param("eventId") eventId: string,
    @Body() dto: CreateEventRatingDto,
    @CurrentUser() user: { id: string }
  ) {
    this.validateLang(lang);
    return this.eventRatingService.upsertRating({
      eventId,
      userId: user.id,
      value: dto.value,
    });
  }

  /**
   * Gets the current user's rating for an event.
   * Requires authentication.
   * 
   * Returns: { value, createdAt, updatedAt } or null if not rated yet
   */
  @Get("/me")
  async getMyRating(
    @Param("lang") lang: string,
    @Param("eventId") eventId: string,
    @CurrentUser() user: { id: string }
  ) {
    this.validateLang(lang);
    return this.eventRatingService.getMyRating({
      eventId,
      userId: user.id,
    });
  }
}

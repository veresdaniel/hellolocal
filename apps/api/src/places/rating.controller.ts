import { Controller, Post, Get, Param, Body, BadRequestException, UseGuards } from "@nestjs/common";
import { RatingService } from "./rating.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface CreateRatingDto {
  value: number;
}

@Controller("/api/:lang/places/:placeId/rating")
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Creates or updates a rating for a place.
   * Requires authentication.
   * 
   * Body: { value: 1..5 }
   * Returns: { placeId, userId, value, ratingAvg, ratingCount }
   */
  @Post()
  async createOrUpdateRating(
    @Param("lang") lang: string,
    @Param("placeId") placeId: string,
    @Body() dto: CreateRatingDto,
    @CurrentUser() user: { id: string }
  ) {
    this.validateLang(lang);
    return this.ratingService.upsertRating({
      placeId,
      userId: user.id,
      value: dto.value,
    });
  }

  /**
   * Gets the current user's rating for a place.
   * Requires authentication.
   * 
   * Returns: { value, createdAt, updatedAt } or null if not rated yet
   */
  @Get("/me")
  async getMyRating(
    @Param("lang") lang: string,
    @Param("placeId") placeId: string,
    @CurrentUser() user: { id: string }
  ) {
    this.validateLang(lang);
    return this.ratingService.getMyRating({
      placeId,
      userId: user.id,
    });
  }
}

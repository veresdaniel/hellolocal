import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { TrackDto } from "./dto/track.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("/api/:lang/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  @Post("track")
  async track(
    @Param("lang") lang: string,
    @Body() dto: TrackDto,
    @Req() req: any,
    @Query("siteKey") siteKey?: string
  ) {
    this.validateLang(lang);
    const visitorId = req.headers["x-visitor-id"] as string | undefined;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const referrer = dto.referrer ?? (req.headers["referer"] as string | undefined);

    return this.analytics.track({
      lang,
      siteKey,
      dto,
      visitorId,
      userAgent,
      referrer,
    });
  }

  @Get("site")
  @UseGuards(JwtAuthGuard)
  async siteDashboard(
    @Param("lang") lang: string,
    @Query("range") range = "7",
    @Query("siteKey") siteKey?: string,
    @CurrentUser() user?: { id: string }
  ) {
    this.validateLang(lang);
    if (!user?.id) {
      throw new BadRequestException("User not found");
    }
    return this.analytics.getSiteDashboard({
      lang,
      siteKey,
      rangeDays: Number(range),
      userId: user.id,
    });
  }

  @Get("place/:placeId")
  @UseGuards(JwtAuthGuard)
  async placeDashboard(
    @Param("lang") lang: string,
    @Param("placeId") placeId: string,
    @Query("range") range = "7",
    @Query("siteKey") siteKey?: string,
    @CurrentUser() user?: { id: string }
  ) {
    this.validateLang(lang);
    if (!user?.id) {
      throw new BadRequestException("User not found");
    }
    if (!placeId) {
      throw new BadRequestException("placeId is required");
    }
    return this.analytics.getPlaceDashboard({
      lang,
      siteKey,
      placeId,
      rangeDays: Number(range),
      userId: user.id,
    });
  }

  @Get("event/:eventId")
  @UseGuards(JwtAuthGuard)
  async eventDashboard(
    @Param("lang") lang: string,
    @Param("eventId") eventId: string,
    @Query("range") range = "7",
    @Query("siteKey") siteKey?: string,
    @CurrentUser() user?: { id: string }
  ) {
    this.validateLang(lang);
    if (!user?.id) {
      throw new BadRequestException("User not found");
    }
    if (!eventId) {
      throw new BadRequestException("eventId is required");
    }
    return this.analytics.getEventDashboard({
      lang,
      siteKey,
      eventId,
      rangeDays: Number(range),
      userId: user.id,
    });
  }
}

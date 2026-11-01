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
import { ProductClickDto } from "./dto/product-click.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { assertLang } from "../common/lang";

@Controller("/api/:lang/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}


  @Post("track")
  async track(
    @Param("lang") lang: string,
    @Body() dto: TrackDto,
    @Req() req: any,
    @Query("siteKey") siteKey?: string
  ) {
    assertLang(lang);
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

  @Post("product-click")
  async productClick(@Param("lang") lang: string, @Body() dto: ProductClickDto) {
    assertLang(lang);
    return this.analytics.trackProductClick(dto);
  }

  @Get("global")
  @UseGuards(JwtAuthGuard)
  async globalDashboard(
    @Param("lang") lang: string,
    @Query("range") range = "7",
    @CurrentUser() user?: { id: string }
  ) {
    assertLang(lang);
    if (!user?.id) {
      throw new BadRequestException("User not found");
    }
    return this.analytics.getGlobalDashboard({
      lang,
      rangeDays: Number(range),
      userId: user.id,
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
    assertLang(lang);
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
    assertLang(lang);
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

  @Get("town/:townId")
  @UseGuards(JwtAuthGuard)
  async townDashboard(
    @Param("lang") lang: string,
    @Param("townId") townId: string,
    @Query("range") range = "7",
    @Query("siteKey") siteKey?: string,
    @CurrentUser() user?: { id: string }
  ) {
    assertLang(lang);
    if (!user?.id) {
      throw new BadRequestException("User not found");
    }
    if (!townId) {
      throw new BadRequestException("townId is required");
    }
    return this.analytics.getTownDashboard({
      lang,
      siteKey,
      townId,
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
    assertLang(lang);
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

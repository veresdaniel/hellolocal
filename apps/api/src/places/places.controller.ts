import { Controller, Get, Param, Query } from "@nestjs/common";
import { PlacesService } from "./places.service";

@Controller("/api/:lang/places")
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  list(
    @Param("lang") lang: string,
    @Query("category") category?: string,
    @Query("town") town?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.placesService.list({
      lang,
      category,
      town,
      q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get("/:slug")
  detail(@Param("lang") lang: string, @Param("slug") slug: string) {
    return this.placesService.detail({ lang, slug });
  }
}

import { Controller, Get, Param, Query } from "@nestjs/common";
import { assertLang } from "../common/lang";
import { TownsPublicService } from "./towns-public.service";

/**
 * Public towns (települések) under a site/régió.
 * GET /api/public/:lang/:siteKey/towns
 */
@Controller("/api/public/:lang/:siteKey/towns")
export class TownsPublicController {
  constructor(private readonly townsService: TownsPublicService) {}

  @Get()
  list(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Query("q") q?: string
  ) {
    assertLang(lang);
    return this.townsService.list({ lang, siteKey, q });
  }
}

// entitlements.controller.ts
import { Controller, Get, Query, Param } from "@nestjs/common";
import { EntitlementsService } from "./entitlements.service";
import { Lang } from "@prisma/client";

@Controller("/api/:lang/entitlements")
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  async get(
    @Param("lang") lang: string,
    @Query("siteKey") siteKey?: string
  ) {
    return this.entitlementsService.getForRequest({
      lang: lang as Lang,
      siteKey,
    });
  }
}

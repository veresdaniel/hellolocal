import { Controller, Get, Param } from "@nestjs/common";
import { ResolveService } from "./resolve.service";
import { assertLang } from "../common/lang";

/**
 * Controller for the general resolver endpoint.
 *
 * This endpoint provides a unified way to resolve site keys and slugs
 * to entity information, including canonical URL information for redirects.
 *
 * Route: GET /api/public/:lang/:siteKey/resolve/:slug
 */
@Controller("/api/public/:lang/:siteKey/resolve")
export class ResolveController {
  constructor(private readonly resolveService: ResolveService) {}


  @Get(":slug")
  async resolve(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("slug") slug: string
  ) {
    assertLang(lang);
    return await this.resolveService.resolve({ lang, siteKey, slug });
  }
}

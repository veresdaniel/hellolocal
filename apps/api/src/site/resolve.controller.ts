import { Controller, Get, Param, BadRequestException } from "@nestjs/common";
import { ResolveService } from "./resolve.service";

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

  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  @Get(":slug")
  async resolve(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("slug") slug: string
  ) {
    this.validateLang(lang);
    return await this.resolveService.resolve({ lang, siteKey, slug });
  }
}

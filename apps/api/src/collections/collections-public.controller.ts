import { Controller, Get, Param, Query, BadRequestException, Req } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import type { Request } from "express";

/**
 * Public controller for collection endpoints.
 *
 * Routes:
 * - GET /api/public/collections/by-domain/:domain - Get collection by domain
 * - GET /api/public/collections/by-slug/:slug - Get collection by slug
 *
 * Language is determined from:
 * 1. URL prefix (/hu, /en, /de) if present
 * 2. Query parameter ?lang=hu|en|de
 * 3. Domain default language (if collection has domain)
 * 4. Fallback: hu
 */
@Controller("/api/public/collections")
export class CollectionsPublicController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Gets a collection by domain.
   *
   * Path parameters:
   * - domain: Collection domain
   *
   * Query parameters:
   * - lang: Optional language code (hu, en, de). If not provided, uses domain default or fallback.
   */
  @Get("by-domain/:domain")
  async getByDomain(
    @Param("domain") domain: string,
    @Query("lang") langParam?: string,
    @Req() req?: Request
  ) {
    // Determine language: query param > URL path > fallback
    let lang = langParam;
    if (!lang && req) {
      // Try to extract from URL path (e.g., /hu/collections/...)
      const pathMatch = req.path.match(/^\/(hu|en|de)\//);
      if (pathMatch) {
        lang = pathMatch[1];
      }
    }
    if (!lang) {
      lang = "hu"; // Fallback
    }

    this.validateLang(lang);
    return this.collectionsService.getCollectionView({ lang, domain });
  }

  /**
   * Gets a collection by slug.
   *
   * Path parameters:
   * - slug: Collection slug
   *
   * Query parameters:
   * - lang: Optional language code (hu, en, de). Defaults to hu.
   */
  @Get("by-slug/:slug")
  async getBySlug(
    @Param("slug") slug: string,
    @Query("lang") langParam?: string,
    @Req() req?: Request
  ) {
    // Determine language: query param > URL path > fallback
    let lang = langParam;
    if (!lang && req) {
      // Try to extract from URL path (e.g., /hu/collections/...)
      const pathMatch = req.path.match(/^\/(hu|en|de)\//);
      if (pathMatch) {
        lang = pathMatch[1];
      }
    }
    if (!lang) {
      lang = "hu"; // Fallback
    }

    this.validateLang(lang);
    return this.collectionsService.getCollectionView({ lang, slug });
  }
}

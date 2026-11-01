import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import type { Request } from "express";
import { langFromPath, requireLang, langOrDefault } from "../common/lang";

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
    const detected = langParam || langFromPath(req?.path);
    const lang = detected ? requireLang(detected) : langOrDefault(undefined);
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
    const detected = langParam || langFromPath(req?.path);
    const lang = detected ? requireLang(detected) : langOrDefault(undefined);
    return this.collectionsService.getCollectionView({ lang, slug });
  }
}

import {
  Controller,
  Get,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { GalleryPublicService } from "./gallery-public.service";

/**
 * Public controller for gallery endpoints.
 *
 * Routes:
 * - GET /api/public/:lang/:siteKey/galleries/:id - Get a single gallery by ID
 *
 * All endpoints use path parameters for siteKey (not query parameters).
 */
@Controller("/api/public/:lang/:siteKey/galleries")
export class GalleryPublicController {
  private readonly logger = new Logger(GalleryPublicController.name);

  constructor(private readonly galleryService: GalleryPublicService) {}

  /**
   * Validates that the lang parameter is a valid language code.
   */
  private validateLang(lang: string): void {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }
  }

  /**
   * Gets a single gallery by ID.
   *
   * Path parameters:
   * - lang: Language code (hu, en, de)
   * - siteKey: Site key from URL path
   * - id: Gallery ID
   */
  @Get("/:id")
  async getGallery(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Param("id") id: string
  ) {
    this.validateLang(lang);
    try {
      return await this.galleryService.findOne(lang, siteKey, id);
    } catch (error) {
      // Re-throw NotFoundException and BadRequestException as-is (they have proper status codes)
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Log and re-throw other errors
      this.logger.error(
        `Error getting gallery: lang=${lang}, siteKey=${siteKey}, id=${id}`,
        error instanceof Error ? error.stack : String(error)
      );

      // For unexpected errors, throw as NotFoundException to avoid exposing internal errors
      throw new NotFoundException("Gallery not found");
    }
  }
}

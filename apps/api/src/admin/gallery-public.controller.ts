import {
  Controller,
  Get,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { GalleryPublicService } from "./gallery-public.service";
import { assertLang } from "../common/lang";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

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
    assertLang(lang);
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
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_GALLERY);
    }
  }
}

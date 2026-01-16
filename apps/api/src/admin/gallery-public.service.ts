import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteResolverService } from "../site/site-resolver.service";

@Injectable()
export class GalleryPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteResolverService
  ) {}

  /**
   * Gets a gallery by ID for public access
   * Only returns active galleries
   */
  async findOne(lang: string, siteKey: string, galleryId: string) {
    try {
      // Resolve siteKey to siteId
      const site = await this.siteResolver.resolveSite({ lang, siteKey });

      const gallery = await this.prisma.gallery.findFirst({
        where: {
          id: galleryId,
          siteId: site.siteId,
          isActive: true,
        },
      });

      if (!gallery) {
        throw new NotFoundException("Gallery not found");
      }

      // Ensure images is an array (Prisma returns JSON, but we want to guarantee it's an array)
      let images: any[] = [];
      try {
        if (gallery.images) {
          if (Array.isArray(gallery.images)) {
            images = gallery.images;
          } else if (typeof gallery.images === "string") {
            // Try to parse if it's a string
            images = JSON.parse(gallery.images);
          } else if (typeof gallery.images === "object") {
            // If it's already an object, try to convert to array
            images = Array.isArray(gallery.images) ? gallery.images : [gallery.images];
          }
        }
      } catch (error) {
        // If parsing fails, use empty array
        images = [];
      }

      // Ensure columns is properly formatted (can be null or JSON object)
      let columns: any = null;
      try {
        if (gallery.columns) {
          if (typeof gallery.columns === "object") {
            columns = gallery.columns;
          } else if (typeof gallery.columns === "string") {
            columns = JSON.parse(gallery.columns);
          }
        }
      } catch (error) {
        // If parsing fails, use null
        columns = null;
      }

      return {
        id: gallery.id,
        siteId: gallery.siteId,
        placeId: gallery.placeId,
        eventId: gallery.eventId,
        name: gallery.name,
        images,
        layout: gallery.layout || "grid",
        columns,
        aspect: gallery.aspect || "auto",
        isActive: gallery.isActive,
        createdAt: gallery.createdAt.toISOString(),
        updatedAt: gallery.updatedAt.toISOString(),
      };
    } catch (error) {
      // Re-throw NotFoundException as-is
      if (error instanceof NotFoundException) {
        throw error;
      }
      // For other errors, wrap in NotFoundException to avoid exposing internal errors
      throw new NotFoundException("Gallery not found");
    }
  }
}

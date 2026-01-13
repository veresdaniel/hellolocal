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
    const images = Array.isArray(gallery.images) ? gallery.images : [];

    // Ensure columns is properly formatted (can be null or JSON object)
    const columns = gallery.columns && typeof gallery.columns === 'object' ? gallery.columns : null;

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
  }
}

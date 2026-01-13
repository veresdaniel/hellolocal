import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlacesPriceListService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get price list for a place (public)
   * Only returns if:
   * - isEnabled is true
   * - isActive is true
   * - has at least one block with at least one item
   * - requireAuth is false OR user is authenticated (handled by controller/guard)
   */
  async getPriceList(placeId: string, siteId: string, requireAuth: boolean = false): Promise<any> {
    const priceList = await this.prisma.placePriceList.findUnique({
      where: { placeId },
      include: {
        place: {
          select: {
            id: true,
            siteId: true,
            isActive: true,
          },
        },
      },
    });

    if (!priceList) {
      return null;
    }

    // Verify place belongs to site and is active
    if (priceList.place.siteId !== siteId || !priceList.place.isActive) {
      throw new NotFoundException("Place not found");
    }

    // Check if module is enabled
    if (!priceList.isEnabled) {
      return null;
    }

    // Check if price list is active
    if (!priceList.isActive) {
      return null;
    }

    // Check if price list has content (at least one block with at least one item)
    const blocks = priceList.blocks as any[];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return null;
    }

    const hasContent = blocks.some((block) => {
      return Array.isArray(block.items) && block.items.length > 0;
    });

    if (!hasContent) {
      return null;
    }

    // Check authentication requirement
    if (priceList.requireAuth && !requireAuth) {
      throw new ForbiddenException("Authentication required to view price list");
    }

    // Return price list (without place relation)
    return {
      id: priceList.id,
      placeId: priceList.placeId,
      currency: priceList.currency,
      blocks: priceList.blocks,
      note: priceList.note,
    };
  }

  /**
   * Check if place has a valid price list (for hasPriceList flag)
   */
  async hasPriceList(placeId: string, siteId: string): Promise<boolean> {
    const priceList = await this.prisma.placePriceList.findUnique({
      where: { placeId },
      include: {
        place: {
          select: {
            id: true,
            siteId: true,
            isActive: true,
          },
        },
      },
    });

    if (!priceList) {
      return false;
    }

    // Verify place belongs to site and is active
    if (priceList.place.siteId !== siteId || !priceList.place.isActive) {
      return false;
    }

    // Check if module is enabled
    if (!priceList.isEnabled) {
      return false;
    }

    // Check if price list is active
    if (!priceList.isActive) {
      return false;
    }

    // Check if price list has content
    const blocks = priceList.blocks as any[];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return false;
    }

    const hasContent = blocks.some((block) => {
      return Array.isArray(block.items) && block.items.length > 0;
    });

    return hasContent;
  }
}

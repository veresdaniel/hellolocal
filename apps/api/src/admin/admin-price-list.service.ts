import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";

export interface PriceListBlock {
  title: string;
  items: Array<{
    label: string;
    price: number | null;
    note?: string;
  }>;
}

export interface UpdatePriceListDto {
  blocks: PriceListBlock[];
  currency?: string;
  note?: string | null;
  isActive?: boolean;
  isEnabled?: boolean;
  requireAuth?: boolean;
}

@Injectable()
export class AdminPriceListService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get price list for a place (admin)
   */
  async getPriceList(placeId: string, siteId: string, userId?: string): Promise<any> {
    // Verify place exists and belongs to site
    const place = await this.prisma.place.findFirst({
      where: {
        id: placeId,
        siteId,
      },
      include: {
        priceList: true,
      },
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Check permissions if userId is provided
    if (userId) {
      // Check if user has access to this place
      const hasAccess = await this.hasPlaceAccess(userId, placeId, siteId);
      if (!hasAccess) {
        throw new ForbiddenException("You do not have access to this place");
      }
    }

    return place.priceList || null;
  }

  /**
   * Upsert price list for a place (admin)
   */
  async upsertPriceList(
    placeId: string,
    siteId: string,
    dto: UpdatePriceListDto,
    userId?: string
  ): Promise<any> {
    // Verify place exists and belongs to site
    const place = await this.prisma.place.findFirst({
      where: {
        id: placeId,
        siteId,
      },
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Check permissions if userId is provided
    if (userId) {
      const hasAccess = await this.hasPlaceAccess(userId, placeId, siteId);
      if (!hasAccess) {
        throw new ForbiddenException("You do not have access to this place");
      }
    }

    // Validate blocks structure
    this.validateBlocks(dto.blocks);

    // Prepare data
    const data: any = {
      placeId,
      blocks: dto.blocks,
    };

    if (dto.currency !== undefined) {
      data.currency = dto.currency;
    }
    if (dto.note !== undefined) {
      data.note = dto.note;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.isEnabled !== undefined) {
      data.isEnabled = dto.isEnabled;
    }
    if (dto.requireAuth !== undefined) {
      data.requireAuth = dto.requireAuth;
    }

    // Upsert price list
    return this.prisma.placePriceList.upsert({
      where: { placeId },
      update: data,
      create: data,
    });
  }

  /**
   * Validate blocks structure
   */
  private validateBlocks(blocks: PriceListBlock[]): void {
    if (!Array.isArray(blocks)) {
      throw new BadRequestException("Blocks must be an array");
    }

    for (const block of blocks) {
      if (!block.title || typeof block.title !== "string") {
        throw new BadRequestException("Each block must have a title");
      }

      if (!Array.isArray(block.items)) {
        throw new BadRequestException("Each block must have an items array");
      }

      for (const item of block.items) {
        if (!item.label || typeof item.label !== "string") {
          throw new BadRequestException("Each item must have a label");
        }

        if (item.price !== null && item.price !== undefined) {
          if (typeof item.price !== "number") {
            throw new BadRequestException("Price must be a number or null");
          }
          if (item.price < 0) {
            throw new BadRequestException("Price cannot be negative");
          }
          if (item.price > 9999999) {
            throw new BadRequestException("Price cannot exceed 9,999,999");
          }
        }
      }
    }
  }

  /**
   * Check if user has access to place (site admin or place owner/manager/editor)
   */
  private async hasPlaceAccess(userId: string, placeId: string, siteId: string): Promise<boolean> {
    // Check global user role first - superadmin has access to everything
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Superadmin has access to everything
    if (user.role === UserRole.superadmin) {
      return true;
    }

    // Check site membership (site admin/editor)
    const siteMembership = await this.prisma.siteMembership.findUnique({
      where: {
        siteId_userId: {
          siteId,
          userId,
        },
      },
    });

    if (siteMembership && (siteMembership.role === "siteadmin" || siteMembership.role === "editor")) {
      return true;
    }

    // Check place membership (owner/manager/editor)
    const placeMembership = await this.prisma.placeMembership.findUnique({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
    });

    if (placeMembership && (placeMembership.role === "owner" || placeMembership.role === "manager" || placeMembership.role === "editor")) {
      return true;
    }

    // Check if user is place owner
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { ownerId: true },
    });

    if (place?.ownerId === userId) {
      return true;
    }

    return false;
  }
}

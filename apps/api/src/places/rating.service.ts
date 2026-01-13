import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts a rating for a place by a user.
   * Validates that value is between 1 and 5.
   * Updates aggregated ratingAvg and ratingCount on the Place.
   * Uses a transaction to ensure consistency.
   */
  async upsertRating(args: { placeId: string; userId: string; value: number }) {
    // Validate rating value
    if (!Number.isInteger(args.value) || args.value < 1 || args.value > 5) {
      throw new BadRequestException("Rating value must be an integer between 1 and 5");
    }

    // Check if place exists
    const place = await this.prisma.place.findUnique({
      where: { id: args.placeId },
      select: { id: true },
    });

    if (!place) {
      throw new NotFoundException("Place not found");
    }

    // Upsert rating and update aggregated fields in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Upsert the rating
      await tx.placeRating.upsert({
        where: {
          placeId_userId: {
            placeId: args.placeId,
            userId: args.userId,
          },
        },
        create: {
          placeId: args.placeId,
          userId: args.userId,
          value: args.value,
        },
        update: {
          value: args.value,
        },
      });

      // Calculate aggregated values
      const aggregate = await tx.placeRating.aggregate({
        where: { placeId: args.placeId },
        _avg: { value: true },
        _count: { value: true },
      });

      const ratingAvg = aggregate._avg.value ? Number(aggregate._avg.value.toFixed(2)) : null;
      const ratingCount = aggregate._count.value || 0;

      // Update Place with aggregated values
      await tx.place.update({
        where: { id: args.placeId },
        data: {
          ratingAvg,
          ratingCount,
        },
      });

      return {
        placeId: args.placeId,
        userId: args.userId,
        value: args.value,
        ratingAvg,
        ratingCount,
      };
    });
  }

  /**
   * Gets a user's rating for a specific place.
   * Returns null if the user hasn't rated the place yet.
   */
  async getMyRating(args: { placeId: string; userId: string }) {
    const rating = await this.prisma.placeRating.findUnique({
      where: {
        placeId_userId: {
          placeId: args.placeId,
          userId: args.userId,
        },
      },
      select: {
        value: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rating;
  }
}

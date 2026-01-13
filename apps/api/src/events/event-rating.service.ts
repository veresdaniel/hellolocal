import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EventRatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts a rating for an event by a user.
   * Validates that value is between 1 and 5.
   * Updates aggregated ratingAvg and ratingCount on the Event.
   * Uses a transaction to ensure consistency.
   */
  async upsertRating(args: { eventId: string; userId: string; value: number }) {
    // Validate rating value
    if (!Number.isInteger(args.value) || args.value < 1 || args.value > 5) {
      throw new BadRequestException("Rating value must be an integer between 1 and 5");
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Upsert rating and update aggregated fields in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Upsert the rating
      await tx.eventRating.upsert({
        where: {
          eventId_userId: {
            eventId: args.eventId,
            userId: args.userId,
          },
        },
        create: {
          eventId: args.eventId,
          userId: args.userId,
          value: args.value,
        },
        update: {
          value: args.value,
        },
      });

      // Calculate aggregated values
      const aggregate = await tx.eventRating.aggregate({
        where: { eventId: args.eventId },
        _avg: { value: true },
        _count: { value: true },
      });

      const ratingAvg = aggregate._avg.value ? Number(aggregate._avg.value.toFixed(2)) : null;
      const ratingCount = aggregate._count.value || 0;

      // Update Event with aggregated values
      await tx.event.update({
        where: { id: args.eventId },
        data: {
          ratingAvg,
          ratingCount,
        },
      });

      return {
        eventId: args.eventId,
        userId: args.userId,
        value: args.value,
        ratingAvg,
        ratingCount,
      };
    });
  }

  /**
   * Gets a user's rating for a specific event.
   * Returns null if the user hasn't rated the event yet.
   */
  async getMyRating(args: { eventId: string; userId: string }) {
    const rating = await this.prisma.eventRating.findUnique({
      where: {
        eventId_userId: {
          eventId: args.eventId,
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

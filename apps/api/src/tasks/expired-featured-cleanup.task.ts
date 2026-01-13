// apps/api/src/tasks/expired-featured-cleanup.task.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Scheduled task to clean up expired featured placements
 * Runs daily at 2 AM to reset isFeatured flag for places where featuredUntil has passed
 */
@Injectable()
export class ExpiredFeaturedCleanupTask {
  private readonly logger = new Logger(ExpiredFeaturedCleanupTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredFeaturedCleanup() {
    this.logger.log("Starting expired featured cleanup task...");

    try {
      const now = new Date();
      
      const result = await this.prisma.place.updateMany({
        where: {
          isFeatured: true,
          featuredUntil: {
            lt: now, // Less than current time = expired
          },
        },
        data: {
          isFeatured: false,
        },
      });

      this.logger.log(`Expired featured cleanup completed. Reset ${result.count} places.`);
    } catch (error) {
      this.logger.error("Error during expired featured cleanup:", error);
    }
  }
}

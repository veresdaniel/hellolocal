/**
 * Daily job: after the free-plan trial (`PlaceSubscription.validUntil` or
 * `createdAt + freeTrialDays`), suspend the owner account so public content hides.
 * Superadmin owners are never auto-suspended.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PlacePlan, SubscriptionStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  FREE_TRIAL_DAYS_KEY,
  parseFreeTrialDays,
} from "../common/free-trial";
import { SitemapService } from "../seo/sitemap.service";

@Injectable()
export class FreeTrialSuspendTask {
  private readonly logger = new Logger(FreeTrialSuspendTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitemapService: SitemapService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleFreeTrialExpiry() {
    this.logger.log("Starting free-trial auto-suspend…");
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { key: FREE_TRIAL_DAYS_KEY },
      });
      const trialDays = parseFreeTrialDays(setting?.value);
      const now = new Date();
      const legacyCutoff = new Date(now.getTime());
      legacyCutoff.setUTCDate(legacyCutoff.getUTCDate() - trialDays);

      const expired = await this.prisma.place.findMany({
        where: {
          plan: PlacePlan.free,
          ownerId: { not: null },
          owner: {
            isActive: true,
            role: { not: UserRole.superadmin },
          },
          OR: [
            {
              subscription: {
                status: SubscriptionStatus.ACTIVE,
                validUntil: { lt: now },
              },
            },
            {
              subscription: null,
              createdAt: { lt: legacyCutoff },
            },
          ],
        },
        select: { id: true, ownerId: true },
      });

      if (expired.length === 0) {
        this.logger.log("Free-trial auto-suspend: nothing to do.");
        return;
      }

      const ownerIds = [...new Set(expired.map((row) => row.ownerId!).filter(Boolean))];
      const placeIds = expired.map((row) => row.id);

      await this.prisma.$transaction([
        this.prisma.user.updateMany({
          where: {
            id: { in: ownerIds },
            role: { not: UserRole.superadmin },
            isActive: true,
          },
          data: { isActive: false },
        }),
        this.prisma.placeSubscription.updateMany({
          where: {
            placeId: { in: placeIds },
            status: SubscriptionStatus.ACTIVE,
          },
          data: {
            status: SubscriptionStatus.SUSPENDED,
            statusChangedAt: now,
          },
        }),
      ]);

      this.sitemapService.invalidate();
      this.logger.log(
        `Free-trial auto-suspend: ${ownerIds.length} user(s), ${placeIds.length} place(s) (trial ${trialDays}d).`
      );
    } catch (error) {
      this.logger.error("Free-trial auto-suspend failed", error);
    }
  }
}

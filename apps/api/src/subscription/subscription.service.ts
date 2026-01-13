// subscription.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminEventLogService } from "../event-log/admin-eventlog.service";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private readonly eventLogService?: AdminEventLogService
  ) {}

  /* =========================
     GET CURRENT SUBSCRIPTION
     ========================= */
  async getForSite(siteId: string) {
    return this.prisma.siteSubscription.findFirst({
      where: {
        siteId,
        status: { in: ["ACTIVE", "CANCELLED"] },
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
    });
  }

  async getForPlace(placeId: string) {
    return this.prisma.placeSubscription.findFirst({
      where: {
        placeId,
        status: { in: ["ACTIVE", "CANCELLED"] },
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
    });
  }

  /* =========================
     CANCEL (user action)
     ========================= */
  async cancel(subscriptionId: string, scope: "site" | "place") {
    const subscription = scope === "site"
      ? await this.prisma.siteSubscription.findUnique({ where: { id: subscriptionId } })
      : await this.prisma.placeSubscription.findUnique({ where: { id: subscriptionId } });

    if (!subscription) {
      throw new NotFoundException(`${scope} subscription not found`);
    }

    if (subscription.status === "CANCELLED") {
      throw new BadRequestException("Subscription is already cancelled");
    }

    const oldStatus = subscription.status;
    const updated = scope === "site"
      ? await this.prisma.siteSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "CANCELLED",
            statusChangedAt: new Date(),
          },
        })
      : await this.prisma.placeSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "CANCELLED",
            statusChangedAt: new Date(),
          },
        });

    // Create history entry for cancellation
    try {
      await this.prisma.subscriptionHistory.create({
        data: {
          scope,
          subscriptionId: subscriptionId,
          changeType: "STATUS_CHANGE",
          oldPlan: subscription.plan,
          newPlan: subscription.plan,
          oldStatus: oldStatus,
          newStatus: "CANCELLED",
          oldValidUntil: subscription.validUntil,
          newValidUntil: subscription.validUntil,
          note: "Subscription cancelled by user",
          changedBy: null, // User action, not admin
        },
      });
    } catch (error) {
      console.error("Error creating subscription history entry:", error);
      // Don't throw - history logging should not break the main operation
    }

    // Log event to event log
    if (this.eventLogService) {
      try {
        // Get siteId from subscription (for site subscriptions) or from place (for place subscriptions)
        let siteId: string | null = null;
        if (scope === "site") {
          const siteSub = await this.prisma.siteSubscription.findUnique({
            where: { id: subscriptionId },
            select: { siteId: true },
          });
          siteId = siteSub?.siteId || null;
        } else {
          const placeSub = await this.prisma.placeSubscription.findUnique({
            where: { id: subscriptionId },
            include: { place: { select: { siteId: true } } },
          });
          siteId = placeSub?.place?.siteId || null;
        }

        if (siteId) {
          // Try to get userId from site owner or place owner
          let userId: string | null = null;
          if (scope === "site") {
            // Get siteadmin from siteMemberships (Site doesn't have ownerId)
            const siteAdmin = await this.prisma.siteMembership.findFirst({
              where: {
                siteId: siteId,
                role: "siteadmin",
              },
              select: { userId: true },
            });
            userId = siteAdmin?.userId || null;
          } else {
            const placeSub = await this.prisma.placeSubscription.findUnique({
              where: { id: subscriptionId },
              include: { place: { select: { ownerId: true } } },
            });
            userId = placeSub?.place?.ownerId || null;
          }

          if (userId) {
            await this.eventLogService.create({
              siteId,
              userId,
              action: "update",
              entityType: "subscription",
              entityId: subscriptionId,
              description: `Subscription cancelled (${subscription.plan} plan)`,
              metadata: {
                scope,
                plan: subscription.plan,
                oldStatus,
                newStatus: "CANCELLED",
              },
            });
          }
        }
      } catch (error) {
        console.error("Error creating event log entry:", error);
        // Don't throw - event logging should not break the main operation
      }
    }

    return updated;
  }

  /* =========================
     EXPIRE (cron / job)
     ========================= */
  async expireExpired() {
    const now = new Date();
    
    const siteExpired = await this.prisma.siteSubscription.updateMany({
      where: {
        status: { in: ["ACTIVE", "CANCELLED"] },
        validUntil: { lt: now },
      },
      data: {
        status: "EXPIRED",
        statusChangedAt: now,
      },
    });

    const placeExpired = await this.prisma.placeSubscription.updateMany({
      where: {
        status: { in: ["ACTIVE", "CANCELLED"] },
        validUntil: { lt: now },
      },
      data: {
        status: "EXPIRED",
        statusChangedAt: now,
      },
    });

    return {
      siteExpired: siteExpired.count,
      placeExpired: placeExpired.count,
    };
  }

  /* =========================
     ENTITLEMENTS (KEY!)
     ========================= */
  async getEntitlements(args: {
    siteId?: string;
    placeId?: string;
  }) {
    const sub = args.placeId
      ? await this.getForPlace(args.placeId)
      : args.siteId
        ? await this.getForSite(args.siteId)
        : null;

    if (!sub || sub.status === "EXPIRED") {
      return this.basicPlan();
    }

    return this.planMatrix(sub.plan);
  }

  /* =========================
     PLAN MATRIX
     ========================= */
  private planMatrix(plan: SubscriptionPlan) {
    switch (plan) {
      case "PRO":
        return {
          canCreateEvent: true,
          maxImages: 20,
          canBeFeatured: true,
        };
      case "BUSINESS":
        return {
          canCreateEvent: true,
          maxImages: Infinity,
          canBeFeatured: true,
        };
      case "BASIC":
      default:
        return this.basicPlan();
    }
  }

  private basicPlan() {
    return {
      canCreateEvent: false, // Nincs események
      maxImages: Infinity, // Korlátlan kép
      canBeFeatured: false, // Nincs kiemelt helyek
    };
  }
}

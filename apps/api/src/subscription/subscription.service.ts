// subscription.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

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

    return scope === "site"
      ? this.prisma.siteSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "CANCELLED",
            statusChangedAt: new Date(),
          },
        })
      : this.prisma.placeSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: "CANCELLED",
            statusChangedAt: new Date(),
          },
        });
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

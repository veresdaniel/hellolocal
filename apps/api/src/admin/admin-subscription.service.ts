import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionPlan, SubscriptionStatus, BillingPeriod } from "@prisma/client";

export interface SubscriptionListItem {
  scope: "site" | "place";
  id: string;
  entityId: string;
  entityName: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  validUntil: string | null;
  owner: {
    name: string;
    email: string;
    phone?: string | null;
  };
  adminUrl: string;
  publicUrl?: string;
}

export interface SubscriptionSummary {
  activeCount: number;
  expiringCount: number;
  newCount: number;
  churnCount: number;
  netChange: number;
  mrrCents?: number;
}

export interface TrendPoint {
  weekStart: string;
  active: number;
  new: number;
  churn: number;
}

export interface UpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  validUntil?: Date | string | null;
  billingPeriod?: BillingPeriod;
  priceCents?: number | null;
  currency?: string | null;
  note?: string | null;
}

@Injectable()
export class AdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get subscriptions list with filters
   */
  async findAll(params: {
    scope?: "site" | "place" | "all";
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    q?: string;
    expiresWithinDays?: number;
    take?: number;
    skip?: number;
  }): Promise<{ items: SubscriptionListItem[]; total: number }> {
    try {
      const { scope = "all", status, plan, q, expiresWithinDays, take = 50, skip = 0 } = params;

      const items: SubscriptionListItem[] = [];
      let total = 0;

    // Build date filter for expiring
    const expiresFilter =
      expiresWithinDays !== undefined
        ? {
            validUntil: {
              lte: new Date(Date.now() + expiresWithinDays * 24 * 60 * 60 * 1000),
              gte: new Date(),
            },
          }
        : undefined;

    // Site subscriptions
    if (scope === "site" || scope === "all") {
      const siteWhere: any = {
        subscription: {
          ...(status && { status }),
          ...(plan && { plan }),
          ...(expiresFilter && { validUntil: expiresFilter.validUntil }),
        },
      };

      if (q) {
        siteWhere.OR = [
          { slug: { contains: q, mode: "insensitive" } },
          { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
          { primaryDomain: { contains: q, mode: "insensitive" } },
        ];
      }

      const siteSubscriptions = await this.prisma.siteSubscription.findMany({
        where: {
          ...(status && { status }),
          ...(plan && { plan }),
          ...(expiresFilter && { validUntil: expiresFilter.validUntil }),
          site: q
            ? {
                OR: [
                  { slug: { contains: q, mode: "insensitive" } },
                  { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
                  { primaryDomain: { contains: q, mode: "insensitive" } },
                ],
              }
            : undefined,
        },
        include: {
          site: {
            include: {
              translations: true,
              siteMemberships: {
                where: { role: "siteadmin" },
                include: {
                  user: true,
                },
                take: 1,
              },
            },
          },
        },
        take: scope === "site" ? take : undefined,
        skip: scope === "site" ? skip : undefined,
        orderBy: { validUntil: "asc" },
      });

      for (const sub of siteSubscriptions) {
        const site = sub.site;
        const translation = site.translations[0] || { name: site.slug };
        const admin = site.siteMemberships[0]?.user;

        items.push({
          scope: "site",
          id: sub.id,
          entityId: site.id,
          entityName: translation.name,
          plan: sub.plan,
          status: sub.status,
          validUntil: sub.validUntil?.toISOString() || null,
          owner: {
            name: admin ? `${admin.firstName} ${admin.lastName}` : "N/A",
            email: admin?.email || "",
            phone: null,
          },
          adminUrl: `/admin/sites/${site.id}/edit`,
          publicUrl: site.primaryDomain || undefined,
        });
      }

      if (scope === "site") {
        total = await this.prisma.siteSubscription.count({
          where: {
            ...(status && { status }),
            ...(plan && { plan }),
            ...(expiresFilter && { validUntil: expiresFilter.validUntil }),
            site: q
              ? {
                  OR: [
                    { slug: { contains: q, mode: "insensitive" } },
                    { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
                    { primaryDomain: { contains: q, mode: "insensitive" } },
                  ],
                }
              : undefined,
          },
        });
      }
    }

    // Place subscriptions
    if (scope === "place" || scope === "all") {
      const placeSubscriptions = await this.prisma.placeSubscription.findMany({
        where: {
          ...(status && { status }),
          ...(plan && { plan }),
          ...(expiresFilter && { validUntil: expiresFilter.validUntil }),
          place: q
            ? {
                OR: [
                  { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
                  { owner: { email: { contains: q, mode: "insensitive" } } },
                  { owner: { firstName: { contains: q, mode: "insensitive" } } },
                  { owner: { lastName: { contains: q, mode: "insensitive" } } },
                  { memberships: { some: { role: "owner", user: { email: { contains: q, mode: "insensitive" } } } } },
                  { memberships: { some: { role: "owner", user: { firstName: { contains: q, mode: "insensitive" } } } } },
                  { memberships: { some: { role: "owner", user: { lastName: { contains: q, mode: "insensitive" } } } } },
                ],
              }
            : undefined,
        },
        include: {
          place: {
            include: {
              translations: true,
              owner: true,
              memberships: {
                where: {
                  role: "owner",
                },
                include: {
                  user: true,
                },
                take: 1,
              },
              site: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
        take: scope === "place" ? take : undefined,
        skip: scope === "place" ? skip : undefined,
        orderBy: { validUntil: "asc" },
      });

      for (const sub of placeSubscriptions) {
        const place = sub.place;
        const translation = place.translations[0] || { name: `Place ${place.id}` };
        
        // Get owner from PlaceMembership (owner role) first, fallback to Place.ownerId
        const ownerMembership = place.memberships?.[0];
        const owner = ownerMembership?.user || place.owner;

        items.push({
          scope: "place",
          id: sub.id,
          entityId: place.id,
          entityName: translation.name,
          plan: sub.plan,
          status: sub.status,
          validUntil: sub.validUntil?.toISOString() || null,
          owner: {
            name: owner ? `${owner.firstName} ${owner.lastName}` : "N/A",
            email: owner?.email || "",
            phone: translation.phone || null,
          },
          adminUrl: `/admin/places?edit=${place.id}`,
        });
      }

      if (scope === "place") {
        total = await this.prisma.placeSubscription.count({
          where: {
            ...(status && { status }),
            ...(plan && { plan }),
            ...(expiresFilter && { validUntil: expiresFilter.validUntil }),
            place: q
              ? {
                  OR: [
                    { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
                    { owner: { email: { contains: q, mode: "insensitive" } } },
                  ],
                }
              : undefined,
          },
        });
      }
    }

    if (scope === "all") {
      total = items.length;
      // Apply pagination
      const sorted = items.sort((a, b) => {
        if (!a.validUntil && !b.validUntil) return 0;
        if (!a.validUntil) return 1;
        if (!b.validUntil) return -1;
        return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
      });
      return {
        items: sorted.slice(skip, skip + take),
        total: sorted.length,
      };
    }

      return { items, total };
    } catch (error) {
      console.error("Error in findAll subscriptions:", error);
      // Return empty result if Prisma Client not generated yet
      return { items: [], total: 0 };
    }
  }

  /**
   * Get expiring subscriptions
   */
  async getExpiring(params: {
    scope?: "site" | "place" | "all";
    withinDays?: number;
  }): Promise<SubscriptionListItem[]> {
    try {
      const { scope = "all", withinDays = 7 } = params;
      const result = await this.findAll({
        scope,
        status: SubscriptionStatus.ACTIVE,
        expiresWithinDays: withinDays,
        take: 100,
      });
      return result.items;
    } catch (error) {
      console.error("Error in getExpiring subscriptions:", error);
      return [];
    }
  }

  /**
   * Get KPI summary
   */
  async getSummary(params: {
    scope?: "site" | "place" | "all";
    rangeDays?: number;
  }): Promise<SubscriptionSummary> {
    try {
      const { scope = "all", rangeDays = 7 } = params;
      const now = new Date();
      const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    let activeCount = 0;
    let expiringCount = 0;
    let newCount = 0;
    let churnCount = 0;
    let mrrCents = 0;

    const expiringDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Site subscriptions
    if (scope === "site" || scope === "all") {
      const siteActive = await this.prisma.siteSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      });
      activeCount += siteActive;

      const siteExpiring = await this.prisma.siteSubscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          validUntil: { lte: expiringDate, gte: now },
        },
      });
      expiringCount += siteExpiring;

      const siteNew = await this.prisma.siteSubscription.count({
        where: {
          createdAt: { gte: rangeStart },
          status: SubscriptionStatus.ACTIVE,
        },
      });
      newCount += siteNew;

      const siteChurn = await this.prisma.siteSubscription.count({
        where: {
          statusChangedAt: { gte: rangeStart },
          status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.SUSPENDED] },
        },
      });
      churnCount += siteChurn;

      const siteMrr = await this.prisma.siteSubscription.aggregate({
        where: { status: SubscriptionStatus.ACTIVE },
        _sum: { priceCents: true },
      });
      mrrCents += siteMrr._sum.priceCents || 0;
    }

    // Place subscriptions
    if (scope === "place" || scope === "all") {
      const placeActive = await this.prisma.placeSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      });
      activeCount += placeActive;

      const placeExpiring = await this.prisma.placeSubscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          validUntil: { lte: expiringDate, gte: now },
        },
      });
      expiringCount += placeExpiring;

      const placeNew = await this.prisma.placeSubscription.count({
        where: {
          createdAt: { gte: rangeStart },
          status: SubscriptionStatus.ACTIVE,
        },
      });
      newCount += placeNew;

      const placeChurn = await this.prisma.placeSubscription.count({
        where: {
          statusChangedAt: { gte: rangeStart },
          status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.SUSPENDED] },
        },
      });
      churnCount += placeChurn;

      const placeMrr = await this.prisma.placeSubscription.aggregate({
        where: { status: SubscriptionStatus.ACTIVE },
        _sum: { priceCents: true },
      });
      mrrCents += placeMrr._sum.priceCents || 0;
    }

      return {
        activeCount,
        expiringCount,
        newCount,
        churnCount,
        netChange: newCount - churnCount,
        mrrCents: mrrCents > 0 ? mrrCents : undefined,
      };
    } catch (error) {
      console.error("Error in getSummary subscriptions:", error);
      return {
        activeCount: 0,
        expiringCount: 0,
        newCount: 0,
        churnCount: 0,
        netChange: 0,
      };
    }
  }

  /**
   * Get trends data for chart
   */
  async getTrends(params: {
    scope?: "site" | "place" | "all";
    weeks?: number;
  }): Promise<{ points: TrendPoint[] }> {
    try {
      const { scope = "all", weeks = 12 } = params;
      const points: TrendPoint[] = [];

      const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * weekMs);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + weekMs);

      let active = 0;
      let newCount = 0;
      let churn = 0;

      // Site subscriptions
      if (scope === "site" || scope === "all") {
        const siteActive = await this.prisma.siteSubscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
            OR: [{ validUntil: null }, { validUntil: { gte: weekStart } }],
          },
        });
        active += siteActive;

        const siteNew = await this.prisma.siteSubscription.count({
          where: {
            createdAt: { gte: weekStart, lt: weekEnd },
            status: SubscriptionStatus.ACTIVE,
          },
        });
        newCount += siteNew;

        const siteChurn = await this.prisma.siteSubscription.count({
          where: {
            statusChangedAt: { gte: weekStart, lt: weekEnd },
            status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.SUSPENDED] },
          },
        });
        churn += siteChurn;
      }

      // Place subscriptions
      if (scope === "place" || scope === "all") {
        const placeActive = await this.prisma.placeSubscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
            OR: [{ validUntil: null }, { validUntil: { gte: weekStart } }],
          },
        });
        active += placeActive;

        const placeNew = await this.prisma.placeSubscription.count({
          where: {
            createdAt: { gte: weekStart, lt: weekEnd },
            status: SubscriptionStatus.ACTIVE,
          },
        });
        newCount += placeNew;

        const placeChurn = await this.prisma.placeSubscription.count({
          where: {
            statusChangedAt: { gte: weekStart, lt: weekEnd },
            status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.SUSPENDED] },
          },
        });
        churn += placeChurn;
      }

      points.push({
        weekStart: weekStart.toISOString(),
        active,
        new: newCount,
        churn,
      });
    }

      return { points };
    } catch (error) {
      console.error("Error in getTrends subscriptions:", error);
      return { points: [] };
    }
  }

  /**
   * Helper method to create history entry
   */
  private async createHistoryEntry(data: {
    scope: "site" | "place";
    subscriptionId: string;
    changeType: string;
    oldPlan?: SubscriptionPlan | null;
    newPlan?: SubscriptionPlan | null;
    oldStatus?: SubscriptionStatus | null;
    newStatus?: SubscriptionStatus | null;
    oldValidUntil?: Date | null;
    newValidUntil?: Date | null;
    paymentDueDate?: Date | null;
    amountCents?: number | null;
    currency?: string | null;
    note?: string | null;
    changedBy?: string | null;
  }) {
    try {
      await this.prisma.subscriptionHistory.create({
        data: {
          scope: data.scope,
          subscriptionId: data.subscriptionId,
          changeType: data.changeType,
          oldPlan: data.oldPlan,
          newPlan: data.newPlan,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          oldValidUntil: data.oldValidUntil,
          newValidUntil: data.newValidUntil,
          paymentDueDate: data.paymentDueDate,
          amountCents: data.amountCents,
          currency: data.currency,
          note: data.note,
          changedBy: data.changedBy,
        },
      });
    } catch (error) {
      console.error("Error creating subscription history entry:", error);
      // Don't throw - history logging should not break the main operation
    }
  }

  /**
   * Update subscription
   */
  async update(
    scope: "site" | "place",
    id: string,
    dto: UpdateSubscriptionDto,
    changedBy?: string
  ): Promise<any> {
    try {
    // Get old subscription data
    const oldSubscription = scope === "site"
      ? await this.prisma.siteSubscription.findUnique({ where: { id } })
      : await this.prisma.placeSubscription.findUnique({ where: { id } });

    if (!oldSubscription) {
      throw new NotFoundException(`${scope} subscription not found`);
    }

    const updateData: any = {
      ...(dto.plan !== undefined && { plan: dto.plan }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.billingPeriod !== undefined && { billingPeriod: dto.billingPeriod }),
      ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.note !== undefined && { note: dto.note }),
    };
    
    // Handle validUntil: if explicitly set, use it; otherwise handle based on status/plan changes
    if (dto.validUntil !== undefined) {
      updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    } else if (dto.plan !== undefined && dto.plan !== oldSubscription.plan) {
      // If plan changed and validUntil not set, set to first day of next month
      updateData.validUntil = this.getFirstDayOfNextMonth();
    }

    // Track status change
    if (dto.status !== undefined && dto.status !== oldSubscription.status) {
      updateData.statusChangedAt = new Date();
      
      // If status is changed to SUSPENDED or EXPIRED, set validUntil to first day of next month
      // (unless validUntil is explicitly set)
      if ((dto.status === "SUSPENDED" || dto.status === "EXPIRED") && dto.validUntil === undefined) {
        updateData.validUntil = this.getFirstDayOfNextMonth();
      }
    }

    // Determine change type and create history entry
    let changeType = "UPDATE";
    const planChanged = dto.plan !== undefined && dto.plan !== oldSubscription.plan;
    const statusChanged = dto.status !== undefined && dto.status !== oldSubscription.status;
    const validUntilChanged = dto.validUntil !== undefined && 
      (dto.validUntil ? new Date(dto.validUntil).getTime() : null) !== 
      (oldSubscription.validUntil?.getTime() || null);

    if (planChanged) {
      changeType = "PLAN_CHANGE";
    } else if (statusChanged) {
      changeType = "STATUS_CHANGE";
    } else if (validUntilChanged) {
      changeType = "PAYMENT"; // Payment date change
    }

    // Calculate payment due date (next billing cycle)
    let paymentDueDate: Date | null = null;
    if (dto.validUntil) {
      paymentDueDate = new Date(dto.validUntil);
    } else if (updateData.validUntil) {
      paymentDueDate = new Date(updateData.validUntil);
    }

    if (scope === "site") {
      const subscription = await this.prisma.siteSubscription.update({
        where: { id },
        data: updateData,
        include: {
          site: {
            include: {
              translations: true,
            },
          },
        },
      });

      // Create history entry
      await this.createHistoryEntry({
        scope: "site",
        subscriptionId: id,
        changeType,
        oldPlan: oldSubscription.plan,
        newPlan: dto.plan !== undefined ? dto.plan : oldSubscription.plan,
        oldStatus: oldSubscription.status,
        newStatus: dto.status !== undefined ? dto.status : oldSubscription.status,
        oldValidUntil: oldSubscription.validUntil,
        newValidUntil: subscription.validUntil,
        paymentDueDate,
        amountCents: dto.priceCents !== undefined ? dto.priceCents : oldSubscription.priceCents,
        currency: dto.currency !== undefined ? dto.currency : oldSubscription.currency,
        note: dto.note || (planChanged ? `Plan changed from ${oldSubscription.plan} to ${dto.plan}` : undefined),
        changedBy,
      });

      return subscription;
    } else {
      const subscription = await this.prisma.placeSubscription.update({
        where: { id },
        data: updateData,
        include: {
          place: {
            include: {
              translations: true,
            },
          },
        },
      });

      // Create history entry
      await this.createHistoryEntry({
        scope: "place",
        subscriptionId: id,
        changeType,
        oldPlan: oldSubscription.plan,
        newPlan: dto.plan !== undefined ? dto.plan : oldSubscription.plan,
        oldStatus: oldSubscription.status,
        newStatus: dto.status !== undefined ? dto.status : oldSubscription.status,
        oldValidUntil: oldSubscription.validUntil,
        newValidUntil: subscription.validUntil,
        paymentDueDate,
        amountCents: dto.priceCents !== undefined ? dto.priceCents : oldSubscription.priceCents,
        currency: dto.currency !== undefined ? dto.currency : oldSubscription.currency,
        note: dto.note || (planChanged ? `Plan changed from ${oldSubscription.plan} to ${dto.plan}` : undefined),
        changedBy,
      });

      return subscription;
    }
    } catch (error) {
      console.error("Error in update subscription:", error);
      throw error;
    }
  }

  /**
   * Helper function to get the first day of next month
   */
  private getFirstDayOfNextMonth(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * Helper function to add one month to a date
   */
  private addOneMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    return result;
  }

  /**
   * Extend subscription by one month
   */
  async extend(scope: "site" | "place", id: string, changedBy?: string): Promise<any> {
    try {
    if (scope === "site") {
      const subscription = await this.prisma.siteSubscription.findUnique({
        where: { id },
      });
      if (!subscription) {
        throw new NotFoundException("Site subscription not found");
      }

      const oldValidUntil = subscription.validUntil;
      const newValidUntil = subscription.validUntil
        ? this.addOneMonth(subscription.validUntil)
        : this.getFirstDayOfNextMonth();

      const updated = await this.prisma.siteSubscription.update({
        where: { id },
        data: { validUntil: newValidUntil },
        include: {
          site: {
            include: {
              translations: true,
            },
          },
        },
      });

      // Create history entry
      await this.createHistoryEntry({
        scope: "site",
        subscriptionId: id,
        changeType: "EXTENSION",
        oldPlan: subscription.plan,
        newPlan: subscription.plan,
        oldStatus: subscription.status,
        newStatus: subscription.status,
        oldValidUntil,
        newValidUntil,
        paymentDueDate: newValidUntil,
        amountCents: subscription.priceCents,
        currency: subscription.currency,
        note: "Extended by 1 month",
        changedBy,
      });

      return updated;
    } else {
      const subscription = await this.prisma.placeSubscription.findUnique({
        where: { id },
      });
      if (!subscription) {
        throw new NotFoundException("Place subscription not found");
      }

      const oldValidUntil = subscription.validUntil;
      const newValidUntil = subscription.validUntil
        ? this.addOneMonth(subscription.validUntil)
        : this.getFirstDayOfNextMonth();

      const updated = await this.prisma.placeSubscription.update({
        where: { id },
        data: { validUntil: newValidUntil },
        include: {
          place: {
            include: {
              translations: true,
            },
          },
        },
      });

      // Create history entry
      await this.createHistoryEntry({
        scope: "place",
        subscriptionId: id,
        changeType: "EXTENSION",
        oldPlan: subscription.plan,
        newPlan: subscription.plan,
        oldStatus: subscription.status,
        newStatus: subscription.status,
        oldValidUntil,
        newValidUntil,
        paymentDueDate: newValidUntil,
        amountCents: subscription.priceCents,
        currency: subscription.currency,
        note: "Extended by 1 month",
        changedBy,
      });

      return updated;
    }
    } catch (error) {
      console.error("Error in extend subscription:", error);
      throw error;
    }
  }

  /**
   * Get subscription history
   */
  async getHistory(
    scope: "site" | "place",
    subscriptionId: string
  ): Promise<any[]> {
    try {
      const history = await this.prisma.subscriptionHistory.findMany({
        where: {
          scope,
          subscriptionId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return history;
    } catch (error) {
      console.error("Error in getHistory:", error);
      return [];
    }
  }
}

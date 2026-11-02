// entitlements.service.ts
import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../auth/rbac.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { PLAN_DEFS, type Entitlements } from "./entitlements.config";
import { Lang } from "../common/language-code";

const CUSTOMER_LIMITS = {
  free: { placesMax: 1, eventsPerMonthMax: 5 },
  basic: { placesMax: 5, eventsPerMonthMax: 15 },
  pro: { placesMax: 30, eventsPerMonthMax: 30 },
} as const;

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService,
    @Inject(forwardRef(() => RbacService))
    private readonly rbac: RbacService
  ) {}

  async getForRequest(args: { lang: Lang; siteKey?: string }): Promise<Entitlements> {
    const resolved = await this.siteResolver.resolve({
      lang: args.lang,
      siteKey: args.siteKey,
    });

    const siteId = resolved.siteId;

    // 1) subscription betöltés (ha nincs: BASIC/ACTIVE)
    const sub = (await this.prisma.siteSubscription.findUnique({
      where: { siteId },
    })) ?? {
      plan: "BASIC" as const,
      status: "ACTIVE" as const,
      validUntil: null,
    };

    // 2) status normalizálás (lejárt -> EXPIRED)
    const now = new Date();
    const isExpired = sub.validUntil ? sub.validUntil.getTime() < now.getTime() : false;
    const status = isExpired ? "EXPIRED" : sub.status;

    const plan = await this.resolvePlan(siteId, sub.plan);

    // Get plan overrides from Brand (global setting)
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
      select: { planOverrides: true },
    });

    const planOverrides = (brand?.planOverrides as any) || null;
    const planOverride = planOverrides?.[plan];

    // Merge default plan def with override
    const baseDef = PLAN_DEFS[plan];
    const def = planOverride ? this.deepMergePlanDef(baseDef, planOverride) : baseDef;

    // 3) usage számolás (live)
    const [
      placesCount,
      featuredPlacesCount,
      siteMembersCount,
      eventsThisMonthCount,
      domainAliasesCount,
      languagesCount,
      galleriesCount,
    ] = await Promise.all([
      this.prisma.place.count({
        where: { siteId, isActive: true, ownerId: null },
      }),
      this.prisma.place.count({
        where: {
          siteId,
          isActive: true,
          isFeatured: true,
          OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
        },
      }),
      this.prisma.siteMembership.count({
        where: { siteId },
      }),
      this.countEventsThisMonth(siteId),
      this.prisma.siteDomain.count({
        where: { siteId, isActive: true },
      }),
      this.countLanguages(siteId),
      this.prisma.gallery.count({
        where: { siteId, isActive: true },
      }),
    ]);

    return {
      plan,
      status: status as "ACTIVE" | "SUSPENDED" | "EXPIRED",
      validUntil: sub.validUntil ? sub.validUntil.toISOString() : null,

      limits: def.limits,
      features: def.features,

      usage: {
        placesCount,
        featuredPlacesCount,
        eventsThisMonthCount,
        siteMembersCount,
        domainAliasesCount,
        languagesCount,
        galleriesCount,
      },
    };
  }

  /**
   * Get entitlements directly by siteId (for admin/internal use)
   */
  async getBySiteId(siteId: string): Promise<Entitlements> {
    // 1) subscription betöltés (ha nincs: BASIC/ACTIVE)
    const sub = (await this.prisma.siteSubscription.findUnique({
      where: { siteId },
    })) ?? {
      plan: "BASIC" as const,
      status: "ACTIVE" as const,
      validUntil: null,
    };

    // 2) status normalizálás (lejárt -> EXPIRED)
    const now = new Date();
    const isExpired = sub.validUntil ? sub.validUntil.getTime() < now.getTime() : false;
    const status = isExpired ? "EXPIRED" : sub.status;

    const plan = await this.resolvePlan(siteId, sub.plan);

    // Get plan overrides from Brand (global setting)
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
      select: { planOverrides: true },
    });

    const planOverrides = (brand?.planOverrides as any) || null;
    const planOverride = planOverrides?.[plan];

    // Merge default plan def with override
    const baseDef = PLAN_DEFS[plan];
    const def = planOverride ? this.deepMergePlanDef(baseDef, planOverride) : baseDef;

    // 3) usage számolás (live)
    const [
      placesCount,
      featuredPlacesCount,
      siteMembersCount,
      eventsThisMonthCount,
      domainAliasesCount,
      languagesCount,
      galleriesCount,
    ] = await Promise.all([
      this.prisma.place.count({
        where: { siteId, isActive: true, ownerId: null },
      }),
      this.prisma.place.count({
        where: {
          siteId,
          isActive: true,
          isFeatured: true,
          OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
        },
      }),
      this.prisma.siteMembership.count({
        where: { siteId },
      }),
      this.countEventsThisMonth(siteId),
      this.prisma.siteDomain.count({
        where: { siteId, isActive: true },
      }),
      this.countLanguages(siteId),
      this.prisma.gallery.count({
        where: { siteId, isActive: true },
      }),
    ]);

    return {
      plan,
      status: status as "ACTIVE" | "SUSPENDED" | "EXPIRED",
      validUntil: sub.validUntil ? sub.validUntil.toISOString() : null,

      limits: def.limits,
      features: def.features,

      usage: {
        placesCount,
        featuredPlacesCount,
        eventsThisMonthCount,
        siteMembersCount,
        domainAliasesCount,
        languagesCount,
        galleriesCount,
      },
    };
  }

  /**
   * The subscription row is the plan. A municipal label on the region does not
   * unlock unlimited places unless the subscription itself is MUNICIPAL.
   */
  private async resolvePlan(
    _siteId: string,
    subscriptionPlan: string
  ): Promise<"FREE" | "BASIC" | "PRO" | "BUSINESS" | "MUNICIPAL"> {
    if (
      subscriptionPlan === "FREE" ||
      subscriptionPlan === "PRO" ||
      subscriptionPlan === "BUSINESS" ||
      subscriptionPlan === "MUNICIPAL"
    ) {
      return subscriptionPlan;
    }
    return "BASIC";
  }

  /**
   * Deep merge plan definition with override
   */
  private deepMergePlanDef(base: any, override: any): any {
    const result = { ...base };

    // Merge limits
    if (override.limits) {
      const limits = { ...base.limits, ...override.limits };
      // A saved Infinity is the old "no cap" placeholder, not a chosen quota.
      for (const key of ["placesMax", "eventsPerMonthMax"] as const) {
        if (!Number.isFinite(limits[key])) limits[key] = base.limits[key];
      }
      result.limits = limits;
    }

    // Merge features
    if (override.features) {
      result.features = { ...base.features, ...override.features };
    }

    return result;
  }

  private async countEventsThisMonth(siteId: string): Promise<number> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.prisma.event.count({
      where: {
        siteId,
        isActive: true,
        createdAt: { gte: start, lt: end },
        place: { ownerId: null },
      },
    });
  }

  /**
   * Region staff use the region subscription. A place owner uses their own
   * plan (Egy hely / Vállalkozás / Több telephely). Superadmin is uncapped.
   */
  async assertCanAddPlace(actorUserId: string | undefined, siteId: string, willBeActive: boolean) {
    if (await this.isSuperadmin(actorUserId)) return;
    if (actorUserId && (await this.isCustomerActor(actorUserId, siteId))) {
      await this.assertCustomerPlaceAllowance(actorUserId);
      return;
    }
    if (!willBeActive) return;
    await this.assertRegionPlaceAllowance(siteId);
  }

  async assertCustomerPlaceAllowance(userId: string) {
    const plan = await this.customerPlan(userId);
    const max = CUSTOMER_LIMITS[plan].placesMax;
    const count = await this.customerPlaceCount(userId);
    if (count >= max) {
      throw new BadRequestException(`Az előfizetésed ${max} helyet tartalmaz (${count}/${max}).`);
    }
  }

  async assertCanAddEvent(actorUserId: string | undefined, siteId: string, placeId: string) {
    if (await this.isSuperadmin(actorUserId)) return;
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { ownerId: true },
    });
    if (place?.ownerId) {
      await this.assertCustomerEventAllowance(place.ownerId);
      return;
    }
    await this.assertRegionEventAllowance(siteId);
  }

  private async assertCustomerEventAllowance(ownerId: string) {
    const plan = await this.customerPlan(ownerId);
    const max = CUSTOMER_LIMITS[plan].eventsPerMonthMax;
    const { start, end } = this.monthRange();
    const count = await this.prisma.event.count({
      where: {
        isActive: true,
        createdAt: { gte: start, lt: end },
        place: { ownerId },
      },
    });
    if (count >= max) {
      throw new BadRequestException(`Az előfizetésed havi eseménykerete betelt (${count}/${max}).`);
    }
  }

  private async assertRegionPlaceAllowance(siteId: string) {
    const ent = await this.getBySiteId(siteId);
    if (ent.status === "SUSPENDED" || ent.status === "EXPIRED") {
      throw new BadRequestException("Az előfizetés nem aktív, új hely nem vehető fel.");
    }
    const max = ent.limits.placesMax;
    if (!Number.isFinite(max)) return;
    if (ent.usage.placesCount >= max) {
      throw new BadRequestException(`A régió helykerete betelt (${ent.usage.placesCount}/${max}).`);
    }
  }

  private async assertRegionEventAllowance(siteId: string) {
    const ent = await this.getBySiteId(siteId);
    if (ent.status === "SUSPENDED" || ent.status === "EXPIRED") {
      throw new BadRequestException("Az előfizetés nem aktív, új esemény nem vehető fel.");
    }
    if (!ent.features.eventsEnabled) {
      throw new BadRequestException("Ez a csomag nem tartalmaz eseményeket.");
    }
    const max = ent.limits.eventsPerMonthMax;
    if (!Number.isFinite(max)) return;
    if (ent.usage.eventsThisMonthCount >= max) {
      throw new BadRequestException(
        `A régió havi eseménykerete betelt (${ent.usage.eventsThisMonthCount}/${max}).`
      );
    }
  }

  private async isSuperadmin(userId: string | undefined) {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.superadmin;
  }

  private async isCustomerActor(userId: string, siteId: string) {
    const scope = await this.rbac.getContentScope(userId);
    if (scope.unrestricted || scope.regionEditorSiteIds.includes(siteId)) return false;
    if (scope.townIds.length) {
      const town = await this.prisma.town.findFirst({
        where: { id: { in: scope.townIds }, siteId },
        select: { id: true },
      });
      if (town) return false;
    }
    return true;
  }

  private async customerPlan(userId: string): Promise<keyof typeof CUSTOMER_LIMITS> {
    const places = await this.prisma.place.findMany({
      where: { OR: [{ ownerId: userId }, { memberships: { some: { userId } } }] },
      select: { plan: true },
    });
    if (places.some((place) => place.plan === "pro")) return "pro";
    if (places.some((place) => place.plan === "basic")) return "basic";
    return "free";
  }

  private async customerPlaceCount(userId: string) {
    return this.prisma.place.count({
      where: { OR: [{ ownerId: userId }, { memberships: { some: { userId } } }] },
    });
  }

  private monthRange() {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  private async countLanguages(siteId: string): Promise<number> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { languages: true },
    });
    return site?.languages?.length ?? 0;
  }
}

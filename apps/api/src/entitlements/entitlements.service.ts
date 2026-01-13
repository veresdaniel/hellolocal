// entitlements.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { PLAN_DEFS, type Entitlements } from "./entitlements.config";
import { Lang } from "@prisma/client";

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService
  ) {}

  async getForRequest(args: { lang: Lang; siteKey?: string }): Promise<Entitlements> {
    const resolved = await this.siteResolver.resolve({ 
      lang: args.lang, 
      siteKey: args.siteKey 
    });

    const siteId = resolved.siteId;

    // 1) subscription betöltés (ha nincs: FREE/ACTIVE)
    const sub =
      (await this.prisma.siteSubscription.findUnique({
        where: { siteId },
      })) ?? {
        plan: "FREE" as const,
        status: "ACTIVE" as const,
        validUntil: null,
      };

    // 2) status normalizálás (lejárt -> EXPIRED)
    const now = new Date();
    const isExpired = sub.validUntil ? sub.validUntil.getTime() < now.getTime() : false;
    const status = isExpired ? "EXPIRED" : sub.status;

    const plan = sub.plan as "FREE" | "BASIC" | "PRO";
    const def = PLAN_DEFS[plan];

    // 3) usage számolás (live)
    const [
      placesCount,
      featuredPlacesCount,
      siteMembersCount,
      eventsThisMonthCount,
      domainAliasesCount,
      languagesCount,
    ] = await Promise.all([
      this.prisma.place.count({ 
        where: { siteId, isActive: true } 
      }),
      this.prisma.place.count({ 
        where: { 
          siteId, 
          isActive: true, 
          isFeatured: true,
          OR: [
            { featuredUntil: null },
            { featuredUntil: { gt: now } },
          ],
        } 
      }),
      this.prisma.siteMembership.count({ 
        where: { siteId } 
      }),
      this.countEventsThisMonth(siteId),
      this.prisma.siteDomain.count({ 
        where: { siteId, isActive: true } 
      }),
      this.countLanguages(siteId),
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
      },
    };
  }

  /**
   * Get entitlements directly by siteId (for admin/internal use)
   */
  async getBySiteId(siteId: string): Promise<Entitlements> {
    // 1) subscription betöltés (ha nincs: FREE/ACTIVE)
    const sub =
      (await this.prisma.siteSubscription.findUnique({
        where: { siteId },
      })) ?? {
        plan: "FREE" as const,
        status: "ACTIVE" as const,
        validUntil: null,
      };

    // 2) status normalizálás (lejárt -> EXPIRED)
    const now = new Date();
    const isExpired = sub.validUntil ? sub.validUntil.getTime() < now.getTime() : false;
    const status = isExpired ? "EXPIRED" : sub.status;

    const plan = sub.plan as "FREE" | "BASIC" | "PRO";
    const def = PLAN_DEFS[plan];

    // 3) usage számolás (live)
    const [
      placesCount,
      featuredPlacesCount,
      siteMembersCount,
      eventsThisMonthCount,
      domainAliasesCount,
      languagesCount,
    ] = await Promise.all([
      this.prisma.place.count({ 
        where: { siteId, isActive: true } 
      }),
      this.prisma.place.count({ 
        where: { 
          siteId, 
          isActive: true, 
          isFeatured: true,
          OR: [
            { featuredUntil: null },
            { featuredUntil: { gt: now } },
          ],
        } 
      }),
      this.prisma.siteMembership.count({ 
        where: { siteId } 
      }),
      this.countEventsThisMonth(siteId),
      this.prisma.siteDomain.count({ 
        where: { siteId, isActive: true } 
      }),
      this.countLanguages(siteId),
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
      },
    };
  }

  private async countEventsThisMonth(siteId: string): Promise<number> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.prisma.event.count({
      where: { 
        siteId, 
        isActive: true, 
        startDate: { gte: start, lt: end } 
      },
    });
  }

  private async countLanguages(siteId: string): Promise<number> {
    const siteInstances = await this.prisma.siteInstance.findMany({
      where: { siteId },
      select: { lang: true },
    });
    return new Set(siteInstances.map((x) => x.lang)).size;
  }
}

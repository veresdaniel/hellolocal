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

    // 1) subscription betöltés (ha nincs: BASIC/ACTIVE)
    const sub =
      (await this.prisma.siteSubscription.findUnique({
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

    const plan = sub.plan as "BASIC" | "PRO" | "BUSINESS";
    
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
      this.prisma.gallery.count({ 
        where: { siteId, isActive: true } 
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
    const sub =
      (await this.prisma.siteSubscription.findUnique({
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

    const plan = sub.plan as "BASIC" | "PRO" | "BUSINESS";
    
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
      this.prisma.gallery.count({ 
        where: { siteId, isActive: true } 
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
   * Deep merge plan definition with override
   */
  private deepMergePlanDef(base: any, override: any): any {
    const result = { ...base };
    
    // Merge limits
    if (override.limits) {
      result.limits = { ...base.limits, ...override.limits };
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

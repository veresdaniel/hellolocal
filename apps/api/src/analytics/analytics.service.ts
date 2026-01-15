import { BadRequestException, Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { TrackDto } from "./dto/track.dto";
import { RbacService } from "../auth/rbac.service";

type TrackArgs = {
  lang: string;
  siteKey?: string;
  dto: TrackDto;
  visitorId?: string;
  userAgent?: string;
  referrer?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService,
    private readonly rbacService: RbacService
  ) {}

  private toDayStart(d = new Date()) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  }

  private async getSitePlan(siteId: string): Promise<string | null> {
    const sub = await this.prisma.siteSubscription.findUnique({
      where: { siteId },
      select: { plan: true },
    });
    return sub?.plan ?? null;
  }

  private clampRangeByPlan(plan: string | null | undefined, requestedDays: number): number {
    const days = Number.isFinite(requestedDays) ? requestedDays : 7;
    const max =
      plan === "BUSINESS" ? 90 :
      plan === "PRO" ? 90 :
      plan === "BASIC" ? 30 : 7; // FREE/default
    return Math.min(Math.max(days, 1), max);
  }

  async track(args: TrackArgs) {
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    const day = this.toDayStart(new Date());

    type IncrementFields = {
      pageViews?: number;
      placeViews?: number;
      ctaPhone?: number;
      ctaEmail?: number;
      ctaWebsite?: number;
      ctaMaps?: number;
      ctaFloorplan?: number;
    };

    const inc: IncrementFields = {};
    if (args.dto.type === "page_view") inc.pageViews = 1;
    if (args.dto.type === "place_view") inc.placeViews = 1;
    if (args.dto.type === "cta_click") {
      if (!args.dto.ctaType) throw new BadRequestException("ctaType required for cta_click");
      if (args.dto.ctaType === "phone") inc.ctaPhone = 1;
      if (args.dto.ctaType === "email") inc.ctaEmail = 1;
      if (args.dto.ctaType === "website") inc.ctaWebsite = 1;
      if (args.dto.ctaType === "maps") inc.ctaMaps = 1;
      if (args.dto.ctaType === "floorplan") inc.ctaFloorplan = 1;
    }

    // placeId csak place_view / cta_click esetén kötelező (MVP)
    const placeId: string | null =
      args.dto.type === "page_view" ? null : (args.dto.placeId ?? null);

    if ((args.dto.type === "place_view" || args.dto.type === "cta_click") && !placeId) {
      throw new BadRequestException("placeId required for place_view / cta_click");
    }

    // Upsert daily aggregate
    // Note: Prisma's generated types don't properly handle nullable fields in unique constraints
    // Using 'as any' is necessary here because placeId can be null for page_view events
    await this.prisma.analyticsDaily.upsert({
      where: {
        day_siteId_placeId: {
          day,
          siteId: site.siteId,
          placeId: placeId ?? null,
        },
      } as any,
      create: {
        day,
        siteId: site.siteId,
        placeId,
        ...inc,
      },
      update: {
        ...Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, { increment: v as number }])),
      },
    });

    return { ok: true };
  }

  async getSiteDashboard(args: { 
    lang: string; 
    siteKey?: string; 
    rangeDays: number;
    userId: string;
  }) {
    if (!args.userId) {
      throw new BadRequestException("userId is required");
    }
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    // RBAC check: site editor+ required
    const hasPermission = await this.rbacService.hasSitePermission(
      args.userId,
      site.siteId,
      "editor"
    );
    if (!hasPermission) {
      throw new ForbiddenException("Insufficient site permissions. Required: editor or higher");
    }

    const plan = await this.getSitePlan(site.siteId);
    const days = this.clampRangeByPlan(plan, args.rangeDays);
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromDay = this.toDayStart(from);

    const rows = await this.prisma.analyticsDaily.findMany({
      where: { siteId: site.siteId, placeId: null, day: { gte: fromDay } },
      orderBy: { day: "asc" },
      select: { 
        day: true, 
        pageViews: true, 
        placeViews: true, 
        ctaPhone: true, 
        ctaEmail: true, 
        ctaWebsite: true, 
        ctaMaps: true,
        ctaFloorplan: true
      },
    });

    const summary = rows.reduce(
      (acc, r) => {
        acc.pageViews += r.pageViews;
        acc.placeViews += r.placeViews;
        acc.ctaPhone += r.ctaPhone;
        acc.ctaEmail += r.ctaEmail;
        acc.ctaWebsite += r.ctaWebsite;
        acc.ctaMaps += r.ctaMaps;
        acc.ctaFloorplan += r.ctaFloorplan;
        return acc;
      },
      { pageViews: 0, placeViews: 0, ctaPhone: 0, ctaEmail: 0, ctaWebsite: 0, ctaMaps: 0, ctaFloorplan: 0 }
    );

    // Top places (placeId != null) — last N days
    const top = await this.prisma.analyticsDaily.groupBy({
      by: ["placeId"],
      where: { siteId: site.siteId, placeId: { not: null }, day: { gte: fromDay } },
      _sum: { 
        placeViews: true, 
        ctaPhone: true, 
        ctaEmail: true, 
        ctaWebsite: true, 
        ctaMaps: true,
        ctaFloorplan: true
      },
      orderBy: { _sum: { placeViews: "desc" } },
      take: 10,
    });

    // place neveket is betöltjük
    const placeIds = top.map(t => t.placeId!).filter(Boolean);
    const nameById = new Map<string, string>();
    
    if (placeIds.length > 0) {
      const placeNames = await this.prisma.place.findMany({
        where: { id: { in: placeIds } },
        select: { id: true, translations: { select: { lang: true, name: true } } },
      });
      
      placeNames.forEach(p => {
        const name = p.translations.find(t => t.lang === args.lang)?.name 
          ?? p.translations[0]?.name 
          ?? p.id;
        nameById.set(p.id, name);
      });
    }

    return {
      scope: "site",
      days,
      summary,
      timeseries: rows.map(r => ({
        day: r.day.toISOString().slice(0, 10),
        pageViews: r.pageViews,
        placeViews: r.placeViews,
        ctaTotal: r.ctaPhone + r.ctaEmail + r.ctaWebsite + r.ctaMaps + r.ctaFloorplan,
      })),
      ctaBreakdown: summary,
      topPlaces: top.map(t => ({
        placeId: t.placeId,
        name: nameById.get(t.placeId!) ?? t.placeId,
        placeViews: t._sum.placeViews ?? 0,
        ctaTotal: (t._sum.ctaPhone ?? 0) + (t._sum.ctaEmail ?? 0) + (t._sum.ctaWebsite ?? 0) + (t._sum.ctaMaps ?? 0) + (t._sum.ctaFloorplan ?? 0),
      })),
    };
  }

  async getPlaceDashboard(args: { 
    lang: string; 
    siteKey?: string; 
    placeId: string; 
    rangeDays: number;
    userId: string;
  }) {
    if (!args.userId) {
      throw new BadRequestException("userId is required");
    }
    if (!args.placeId) {
      throw new BadRequestException("placeId is required");
    }
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    // RBAC check: place editor+ required
    const hasPermission = await this.rbacService.hasPlacePermission(
      args.userId,
      args.placeId,
      "editor"
    );
    if (!hasPermission) {
      throw new ForbiddenException("Insufficient place permissions. Required: editor or higher");
    }

    const plan = await this.getSitePlan(site.siteId);
    const days = this.clampRangeByPlan(plan, args.rangeDays);
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromDay = this.toDayStart(from);

    const rows = await this.prisma.analyticsDaily.findMany({
      where: { siteId: site.siteId, placeId: args.placeId, day: { gte: fromDay } },
      orderBy: { day: "asc" },
      select: { 
        day: true, 
        placeViews: true, 
        ctaPhone: true, 
        ctaEmail: true, 
        ctaWebsite: true, 
        ctaMaps: true,
        ctaFloorplan: true
      },
    });

    const summary = rows.reduce(
      (acc, r) => {
        acc.placeViews += r.placeViews;
        acc.ctaPhone += r.ctaPhone;
        acc.ctaEmail += r.ctaEmail;
        acc.ctaWebsite += r.ctaWebsite;
        acc.ctaMaps += r.ctaMaps;
        acc.ctaFloorplan += r.ctaFloorplan;
        return acc;
      },
      { placeViews: 0, ctaPhone: 0, ctaEmail: 0, ctaWebsite: 0, ctaMaps: 0, ctaFloorplan: 0 }
    );

    const ctaTotal = summary.ctaPhone + summary.ctaEmail + summary.ctaWebsite + summary.ctaMaps + summary.ctaFloorplan;
    const conversion = summary.placeViews > 0 ? Math.round((ctaTotal / summary.placeViews) * 1000) / 10 : 0;

    return {
      scope: "place",
      placeId: args.placeId,
      days,
      summary: { ...summary, ctaTotal, conversionPct: conversion },
      timeseries: rows.map(r => ({
        day: r.day.toISOString().slice(0, 10),
        placeViews: r.placeViews,
        ctaTotal: r.ctaPhone + r.ctaEmail + r.ctaWebsite + r.ctaMaps + r.ctaFloorplan,
      })),
      ctaBreakdown: summary,
    };
  }

  async getEventDashboard(args: { 
    lang: string; 
    siteKey?: string; 
    eventId: string; 
    rangeDays: number;
    userId: string;
  }) {
    if (!args.userId) {
      throw new BadRequestException("userId is required");
    }
    if (!args.eventId) {
      throw new BadRequestException("eventId is required");
    }
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    // RBAC check: event editor+ required (similar to place)
    // For now, we'll check if user has site editor+ permission
    // TODO: Add event-specific permission check if needed
    const hasPermission = await this.rbacService.hasSitePermission(
      args.userId,
      site.siteId,
      "editor"
    );
    if (!hasPermission) {
      throw new ForbiddenException("Insufficient permissions. Required: editor or higher");
    }

    const plan = await this.getSitePlan(site.siteId);
    const days = this.clampRangeByPlan(plan, args.rangeDays);
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromDay = this.toDayStart(from);

    // For events, we'll use placeViews as eventViews for now
    // TODO: Add eventId to AnalyticsDaily table if needed
    // For now, we'll return empty data structure
    // In a real implementation, you'd query event-specific analytics
    const rows: Array<{
      day: Date;
      placeViews: number;
      ctaPhone: number;
      ctaEmail: number;
      ctaWebsite: number;
      ctaMaps: number;
      ctaFloorplan: number;
    }> = [];

    const summary = rows.reduce(
      (acc, r) => {
        acc.placeViews += r.placeViews;
        acc.ctaPhone += r.ctaPhone;
        acc.ctaEmail += r.ctaEmail;
        acc.ctaWebsite += r.ctaWebsite;
        acc.ctaMaps += r.ctaMaps;
        acc.ctaFloorplan += r.ctaFloorplan;
        return acc;
      },
      { placeViews: 0, ctaPhone: 0, ctaEmail: 0, ctaWebsite: 0, ctaMaps: 0, ctaFloorplan: 0 }
    );

    const ctaTotal = summary.ctaPhone + summary.ctaEmail + summary.ctaWebsite + summary.ctaMaps + summary.ctaFloorplan;
    const conversion = summary.placeViews > 0 ? Math.round((ctaTotal / summary.placeViews) * 1000) / 10 : 0;

    return {
      scope: "event",
      eventId: args.eventId,
      days,
      summary: { 
        eventViews: summary.placeViews, // Using placeViews as eventViews for now
        ctaPhone: summary.ctaPhone,
        ctaEmail: summary.ctaEmail,
        ctaWebsite: summary.ctaWebsite,
        ctaMaps: summary.ctaMaps,
        ctaFloorplan: summary.ctaFloorplan,
        ctaTotal, 
        conversionPct: conversion 
      },
      timeseries: rows.map(r => ({
        day: r.day.toISOString().slice(0, 10),
        eventViews: r.placeViews, // Using placeViews as eventViews for now
        ctaTotal: r.ctaPhone + r.ctaEmail + r.ctaWebsite + r.ctaMaps + r.ctaFloorplan,
      })),
      ctaBreakdown: {
        ctaPhone: summary.ctaPhone,
        ctaEmail: summary.ctaEmail,
        ctaWebsite: summary.ctaWebsite,
        ctaMaps: summary.ctaMaps,
        ctaFloorplan: summary.ctaFloorplan,
      },
    };
  }
}

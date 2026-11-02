import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { TrackDto } from "./dto/track.dto";
import { ProductClickDto } from "./dto/product-click.dto";
import { isMissingProductClickTable } from "./product-click-table";
import { RbacService } from "../auth/rbac.service";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

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
      plan === "BUSINESS" || plan === "MUNICIPAL" ? 90 : plan === "PRO" ? 90 : plan === "BASIC" ? 30 : 7;
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

  async trackProductClick(dto: ProductClickDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, siteId: true, placeId: true },
    });
    if (!product) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_PRODUCT);

    const placeId = await this.resolveProductClickPlace(product, dto.placeId);
    await this.incrementProductClick({
      day: this.toDayStart(new Date()),
      siteId: product.siteId,
      productId: product.id,
      placeId,
    });

    return { ok: true };
  }

  async getGlobalDashboard(args: { lang: string; rangeDays: number; userId: string }) {
    if (!args.userId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: args.userId },
      select: { role: true },
    });
    if (!user || user.role !== UserRole.superadmin) {
      throw new ForbiddenException("Superadmin required for global analytics");
    }

    const days = Math.min(Math.max(Number(args.rangeDays) || 7, 1), 90);
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromDay = this.toDayStart(from);

    const rows = await this.prisma.analyticsDaily.findMany({
      where: { day: { gte: fromDay } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        siteId: true,
        placeId: true,
        pageViews: true,
        placeViews: true,
        ctaPhone: true,
        ctaEmail: true,
        ctaWebsite: true,
        ctaMaps: true,
        ctaFloorplan: true,
      },
    });

    const summary = {
      pageViews: 0,
      placeViews: 0,
      ctaPhone: 0,
      ctaEmail: 0,
      ctaWebsite: 0,
      ctaMaps: 0,
      ctaFloorplan: 0,
    };
    const byDay = new Map<
      string,
      {
        pageViews: number;
        placeViews: number;
        ctaPhone: number;
        ctaEmail: number;
        ctaWebsite: number;
        ctaMaps: number;
        ctaFloorplan: number;
      }
    >();
    const bySite = new Map<
      string,
      {
        pageViews: number;
        placeViews: number;
        ctaPhone: number;
        ctaEmail: number;
        ctaWebsite: number;
        ctaMaps: number;
        ctaFloorplan: number;
      }
    >();

    for (const r of rows) {
      summary.pageViews += r.pageViews;
      summary.placeViews += r.placeViews;
      summary.ctaPhone += r.ctaPhone;
      summary.ctaEmail += r.ctaEmail;
      summary.ctaWebsite += r.ctaWebsite;
      summary.ctaMaps += r.ctaMaps;
      summary.ctaFloorplan += r.ctaFloorplan;

      const dayKey = r.day.toISOString().slice(0, 10);
      const dayAcc = byDay.get(dayKey) || {
        pageViews: 0,
        placeViews: 0,
        ctaPhone: 0,
        ctaEmail: 0,
        ctaWebsite: 0,
        ctaMaps: 0,
        ctaFloorplan: 0,
      };
      dayAcc.pageViews += r.pageViews;
      dayAcc.placeViews += r.placeViews;
      dayAcc.ctaPhone += r.ctaPhone;
      dayAcc.ctaEmail += r.ctaEmail;
      dayAcc.ctaWebsite += r.ctaWebsite;
      dayAcc.ctaMaps += r.ctaMaps;
      dayAcc.ctaFloorplan += r.ctaFloorplan;
      byDay.set(dayKey, dayAcc);

      const siteAcc = bySite.get(r.siteId) || {
        pageViews: 0,
        placeViews: 0,
        ctaPhone: 0,
        ctaEmail: 0,
        ctaWebsite: 0,
        ctaMaps: 0,
        ctaFloorplan: 0,
      };
      siteAcc.pageViews += r.pageViews;
      siteAcc.placeViews += r.placeViews;
      siteAcc.ctaPhone += r.ctaPhone;
      siteAcc.ctaEmail += r.ctaEmail;
      siteAcc.ctaWebsite += r.ctaWebsite;
      siteAcc.ctaMaps += r.ctaMaps;
      siteAcc.ctaFloorplan += r.ctaFloorplan;
      bySite.set(r.siteId, siteAcc);
    }

    const siteIds = Array.from(bySite.keys());
    const nameBySite = new Map<string, string>();
    if (siteIds.length > 0) {
      const sites = await this.prisma.site.findMany({
        where: { id: { in: siteIds } },
        select: {
          id: true,
          slug: true,
          translations: { select: { lang: true, name: true } },
        },
      });
      for (const s of sites) {
        const name =
          s.translations.find((t) => t.lang === args.lang)?.name ??
          s.translations[0]?.name ??
          s.slug ??
          s.id;
        nameBySite.set(s.id, name);
      }
    }

    const topSites = Array.from(bySite.entries())
      .map(([siteId, stats]) => ({
        siteId,
        name: nameBySite.get(siteId) ?? siteId,
        pageViews: stats.pageViews,
        placeViews: stats.placeViews,
        ctaTotal:
          stats.ctaPhone +
          stats.ctaEmail +
          stats.ctaWebsite +
          stats.ctaMaps +
          stats.ctaFloorplan,
      }))
      .sort((a, b) => b.pageViews + b.placeViews - (a.pageViews + a.placeViews))
      .slice(0, 10);

    const topPlacesRaw = await this.prisma.analyticsDaily.groupBy({
      by: ["placeId"],
      where: { placeId: { not: null }, day: { gte: fromDay } },
      _sum: {
        placeViews: true,
        ctaPhone: true,
        ctaEmail: true,
        ctaWebsite: true,
        ctaMaps: true,
        ctaFloorplan: true,
      },
      orderBy: { _sum: { placeViews: "desc" } },
      take: 10,
    });
    const placeIds = topPlacesRaw.map((t) => t.placeId!).filter(Boolean);
    const nameByPlace = new Map<string, string>();
    if (placeIds.length > 0) {
      const places = await this.prisma.place.findMany({
        where: { id: { in: placeIds } },
        select: { id: true, translations: { select: { lang: true, name: true } } },
      });
      for (const p of places) {
        const name =
          p.translations.find((t) => t.lang === args.lang)?.name ??
          p.translations[0]?.name ??
          p.id;
        nameByPlace.set(p.id, name);
      }
    }

    return {
      scope: "global" as const,
      days,
      summary,
      timeseries: Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, stats]) => ({
          day,
          pageViews: stats.pageViews,
          placeViews: stats.placeViews,
          ctaTotal:
            stats.ctaPhone +
            stats.ctaEmail +
            stats.ctaWebsite +
            stats.ctaMaps +
            stats.ctaFloorplan,
        })),
      ctaBreakdown: {
        ctaPhone: summary.ctaPhone,
        ctaEmail: summary.ctaEmail,
        ctaWebsite: summary.ctaWebsite,
        ctaMaps: summary.ctaMaps,
        ctaFloorplan: summary.ctaFloorplan,
      },
      topSites,
      topPlaces: topPlacesRaw.map((t) => ({
        placeId: t.placeId,
        name: nameByPlace.get(t.placeId!) ?? t.placeId,
        placeViews: t._sum.placeViews ?? 0,
        ctaTotal:
          (t._sum.ctaPhone ?? 0) +
          (t._sum.ctaEmail ?? 0) +
          (t._sum.ctaWebsite ?? 0) +
          (t._sum.ctaMaps ?? 0) +
          (t._sum.ctaFloorplan ?? 0),
      })),
    };
  }

  async getSiteDashboard(args: {
    lang: string;
    siteKey?: string;
    rangeDays: number;
    userId: string;
  }) {
    if (!args.userId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    // RBAC check: site editor+ required
    const hasPermission = await this.rbacService.hasSitePermission(
      args.userId,
      site.siteId,
      "editor"
    );
    if (!hasPermission) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_INSUFFICIENT_SITE_PERMISSIONS);
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
        ctaFloorplan: true,
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
      {
        pageViews: 0,
        placeViews: 0,
        ctaPhone: 0,
        ctaEmail: 0,
        ctaWebsite: 0,
        ctaMaps: 0,
        ctaFloorplan: 0,
      }
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
        ctaFloorplan: true,
      },
      orderBy: { _sum: { placeViews: "desc" } },
      take: 10,
    });

    // place neveket is betöltjük
    const placeIds = top.map((t) => t.placeId!).filter(Boolean);
    const nameById = new Map<string, string>();

    if (placeIds.length > 0) {
      const placeNames = await this.prisma.place.findMany({
        where: { id: { in: placeIds } },
        select: { id: true, translations: { select: { lang: true, name: true } } },
      });

      placeNames.forEach((p) => {
        const name =
          p.translations.find((t) => t.lang === args.lang)?.name ?? p.translations[0]?.name ?? p.id;
        nameById.set(p.id, name);
      });
    }

    return {
      scope: "site",
      days,
      summary,
      timeseries: rows.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        pageViews: r.pageViews,
        placeViews: r.placeViews,
        ctaTotal: r.ctaPhone + r.ctaEmail + r.ctaWebsite + r.ctaMaps + r.ctaFloorplan,
      })),
      ctaBreakdown: summary,
      topPlaces: top.map((t) => ({
        placeId: t.placeId,
        name: nameById.get(t.placeId!) ?? t.placeId,
        placeViews: t._sum.placeViews ?? 0,
        ctaTotal:
          (t._sum.ctaPhone ?? 0) +
          (t._sum.ctaEmail ?? 0) +
          (t._sum.ctaWebsite ?? 0) +
          (t._sum.ctaMaps ?? 0) +
          (t._sum.ctaFloorplan ?? 0),
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
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    if (!args.placeId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_PLACE_ID_REQUIRED);
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
        ctaFloorplan: true,
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

    const ctaTotal =
      summary.ctaPhone +
      summary.ctaEmail +
      summary.ctaWebsite +
      summary.ctaMaps +
      summary.ctaFloorplan;
    const conversion =
      summary.placeViews > 0 ? Math.round((ctaTotal / summary.placeViews) * 1000) / 10 : 0;

    const productClicks = await this.placeProductClicks({
      siteId: site.siteId,
      placeId: args.placeId,
      fromDay,
      lang: args.lang,
    });

    return {
      scope: "place",
      placeId: args.placeId,
      days,
      productClicks,
      summary: { ...summary, ctaTotal, conversionPct: conversion },
      timeseries: rows.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        placeViews: r.placeViews,
        ctaTotal: r.ctaPhone + r.ctaEmail + r.ctaWebsite + r.ctaMaps + r.ctaFloorplan,
      })),
      ctaBreakdown: summary,
    };
  }

  async getTownDashboard(args: {
    lang: string;
    siteKey?: string;
    townId: string;
    rangeDays: number;
    userId: string;
  }) {
    if (!args.userId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    if (!args.townId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_TOWN_ID_REQUIRED);
    }
    const town = await this.rbacService.requireTown(args.userId, args.townId);
    const siteId = town.siteId;

    const plan = siteId ? await this.getSitePlan(siteId) : "free";
    const days = this.clampRangeByPlan(plan, args.rangeDays);
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromDay = this.toDayStart(from);

    const places = await this.prisma.place.findMany({
      where: siteId ? { siteId, townId: args.townId } : { townId: args.townId },
      select: { id: true, translations: { select: { lang: true, name: true } } },
    });
    const placeIds = places.map((p) => p.id);

    if (placeIds.length === 0) {
      return {
        scope: "town" as const,
        townId: args.townId,
        days,
        summary: {
          pageViews: 0,
          placeViews: 0,
          ctaPhone: 0,
          ctaEmail: 0,
          ctaWebsite: 0,
          ctaMaps: 0,
          ctaFloorplan: 0,
        },
        timeseries: [] as Array<{
          day: string;
          pageViews: number;
          placeViews: number;
          ctaTotal: number;
        }>,
        ctaBreakdown: {
          ctaPhone: 0,
          ctaEmail: 0,
          ctaWebsite: 0,
          ctaMaps: 0,
          ctaFloorplan: 0,
        },
        topPlaces: [] as Array<{
          placeId: string;
          name: string;
          placeViews: number;
          ctaTotal: number;
        }>,
      };
    }

    const rows = await this.prisma.analyticsDaily.findMany({
      where: {
        ...(siteId ? { siteId } : {}),
        placeId: { in: placeIds },
        day: { gte: fromDay },
      },
      orderBy: { day: "asc" },
      select: {
        day: true,
        placeId: true,
        placeViews: true,
        ctaPhone: true,
        ctaEmail: true,
        ctaWebsite: true,
        ctaMaps: true,
        ctaFloorplan: true,
      },
    });

    const byDay = new Map<
      string,
      {
        placeViews: number;
        ctaPhone: number;
        ctaEmail: number;
        ctaWebsite: number;
        ctaMaps: number;
        ctaFloorplan: number;
      }
    >();
    const summary = {
      pageViews: 0,
      placeViews: 0,
      ctaPhone: 0,
      ctaEmail: 0,
      ctaWebsite: 0,
      ctaMaps: 0,
      ctaFloorplan: 0,
    };
    const byPlace = new Map<
      string,
      {
        placeViews: number;
        ctaPhone: number;
        ctaEmail: number;
        ctaWebsite: number;
        ctaMaps: number;
        ctaFloorplan: number;
      }
    >();

    for (const r of rows) {
      summary.placeViews += r.placeViews;
      summary.ctaPhone += r.ctaPhone;
      summary.ctaEmail += r.ctaEmail;
      summary.ctaWebsite += r.ctaWebsite;
      summary.ctaMaps += r.ctaMaps;
      summary.ctaFloorplan += r.ctaFloorplan;

      const dayKey = r.day.toISOString().slice(0, 10);
      const dayAcc = byDay.get(dayKey) || {
        placeViews: 0,
        ctaPhone: 0,
        ctaEmail: 0,
        ctaWebsite: 0,
        ctaMaps: 0,
        ctaFloorplan: 0,
      };
      dayAcc.placeViews += r.placeViews;
      dayAcc.ctaPhone += r.ctaPhone;
      dayAcc.ctaEmail += r.ctaEmail;
      dayAcc.ctaWebsite += r.ctaWebsite;
      dayAcc.ctaMaps += r.ctaMaps;
      dayAcc.ctaFloorplan += r.ctaFloorplan;
      byDay.set(dayKey, dayAcc);

      if (r.placeId) {
        const placeAcc = byPlace.get(r.placeId) || {
          placeViews: 0,
          ctaPhone: 0,
          ctaEmail: 0,
          ctaWebsite: 0,
          ctaMaps: 0,
          ctaFloorplan: 0,
        };
        placeAcc.placeViews += r.placeViews;
        placeAcc.ctaPhone += r.ctaPhone;
        placeAcc.ctaEmail += r.ctaEmail;
        placeAcc.ctaWebsite += r.ctaWebsite;
        placeAcc.ctaMaps += r.ctaMaps;
        placeAcc.ctaFloorplan += r.ctaFloorplan;
        byPlace.set(r.placeId, placeAcc);
      }
    }

    const nameById = new Map<string, string>();
    for (const p of places) {
      const name =
        p.translations.find((t) => t.lang === args.lang)?.name ??
        p.translations[0]?.name ??
        p.id;
      nameById.set(p.id, name);
    }

    const topPlaces = Array.from(byPlace.entries())
      .map(([placeId, stats]) => ({
        placeId,
        name: nameById.get(placeId) ?? placeId,
        placeViews: stats.placeViews,
        ctaTotal:
          stats.ctaPhone +
          stats.ctaEmail +
          stats.ctaWebsite +
          stats.ctaMaps +
          stats.ctaFloorplan,
      }))
      .sort((a, b) => b.placeViews - a.placeViews)
      .slice(0, 10);

    return {
      scope: "town" as const,
      townId: args.townId,
      days,
      summary,
      timeseries: Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, stats]) => ({
          day,
          pageViews: 0,
          placeViews: stats.placeViews,
          ctaTotal:
            stats.ctaPhone +
            stats.ctaEmail +
            stats.ctaWebsite +
            stats.ctaMaps +
            stats.ctaFloorplan,
        })),
      ctaBreakdown: {
        ctaPhone: summary.ctaPhone,
        ctaEmail: summary.ctaEmail,
        ctaWebsite: summary.ctaWebsite,
        ctaMaps: summary.ctaMaps,
        ctaFloorplan: summary.ctaFloorplan,
      },
      topPlaces,
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
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_USER_ID_REQUIRED);
    }
    if (!args.eventId) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_EVENT_ID_REQUIRED);
    }
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });

    const event = await this.rbacService.requireEvent(args.userId, args.eventId);
    if (event.siteId !== site.siteId) {
      throw new NotFoundException("Event not found");
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

    const ctaTotal =
      summary.ctaPhone +
      summary.ctaEmail +
      summary.ctaWebsite +
      summary.ctaMaps +
      summary.ctaFloorplan;
    const conversion =
      summary.placeViews > 0 ? Math.round((ctaTotal / summary.placeViews) * 1000) / 10 : 0;

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
        conversionPct: conversion,
      },
      timeseries: rows.map((r) => ({
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

  private async incrementProductClick(key: {
    day: Date;
    siteId: string;
    productId: string;
    placeId: string;
  }) {
    const existing = await this.prisma.productClickDaily.findFirst({
      where: key,
      select: { id: true },
    });
    if (existing) {
      await this.prisma.productClickDaily.update({
        where: { id: existing.id },
        data: { clicks: { increment: 1 } },
      });
      return;
    }
    try {
      await this.prisma.productClickDaily.create({ data: { ...key, clicks: 1 } });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
      await this.prisma.productClickDaily.updateMany({
        where: key,
        data: { clicks: { increment: 1 } },
      });
    }
  }

  private async resolveProductClickPlace(
    product: { siteId: string; placeId: string },
    requested?: string
  ): Promise<string> {
    if (product.placeId) return product.placeId;
    if (!requested) {
      throw new BadRequestException("placeId is required for product clicks");
    }
    const place = await this.prisma.place.findFirst({
      where: { id: requested, siteId: product.siteId },
      select: { id: true },
    });
    if (!place) {
      throw new BadRequestException("placeId must belong to the product site");
    }
    return place.id;
  }

  private async placeProductClicks(args: {
    siteId: string;
    placeId: string;
    fromDay: Date;
    lang: string;
  }) {
    const products = await this.prisma.product.findMany({
      where: { siteId: args.siteId, placeId: args.placeId },
      select: { id: true, translations: { select: { lang: true, name: true } } },
    });
    const totals = new Map<string, number>();
    if (products.length > 0) {
      try {
        const sums = await this.prisma.productClickDaily.groupBy({
          by: ["productId"],
          where: {
            siteId: args.siteId,
            placeId: args.placeId,
            productId: { in: products.map((product) => product.id) },
            day: { gte: args.fromDay },
          },
          _sum: { clicks: true },
        });
        for (const row of sums) totals.set(row.productId, row._sum.clicks ?? 0);
      } catch (error) {
        if (!isMissingProductClickTable(error)) throw error;
      }
    }
    return products
      .map((product) => ({
        productId: product.id,
        name: pickProductName(product.translations, args.lang),
        clicks: totals.get(product.id) ?? 0,
      }))
      .sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name, args.lang));
  }
}

function pickProductName(translations: { lang: string; name: string }[], lang: string) {
  return (
    translations.find((row) => row.lang === lang)?.name ||
    translations.find((row) => row.lang === "hu")?.name ||
    translations[0]?.name ||
    ""
  );
}

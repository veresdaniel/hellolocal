import { Injectable } from "@nestjs/common";
import { SlugEntityType } from "@prisma/client";
import { requireLang } from "../common/lang";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { resolveGaMeasurementId } from "../common/ga-measurement-id";
import { assignMissingSlugs, generateSlug } from "../slug/slug.helper";

type ListTownsArgs = {
  lang: string;
  siteKey?: string;
  q?: string;
};

@Injectable()
export class TownsPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService
  ) {}

  /**
   * Public towns under a site. isRegion is true when more than one active town
   * exists (multi-settlement régió). Single-town sites (e.g. Szeged) are not regions.
   */
  async list(args: ListTownsArgs) {
    const lang = requireLang(args.lang);
    const site = await this.siteResolver.resolve({ lang, siteKey: args.siteKey });
    const q = args.q?.trim();

    const towns = await this.prisma.town.findMany({
      where: {
        siteId: site.siteId,
        isActive: true,
        ...(q
          ? {
              translations: {
                some: {
                  name: { contains: q, mode: "insensitive" as const },
                },
              },
            }
          : {}),
      },
      include: {
        translations: true,
        _count: { select: { places: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const townIds = towns.map((t) => t.id);
    const slugById = new Map<string, string>();
    if (townIds.length > 0) {
      const slugs = await this.prisma.slug.findMany({
        where: {
          siteId: site.siteId,
          entityType: SlugEntityType.town,
          entityId: { in: townIds },
          isActive: true,
          isPrimary: true,
          lang: site.lang,
        },
        select: { entityId: true, slug: true },
      });
      for (const row of slugs) {
        slugById.set(row.entityId, row.slug);
      }
      const missing = townIds.filter((id) => !slugById.has(id));
      if (missing.length > 0) {
        const fallbacks = await this.prisma.slug.findMany({
          where: {
            siteId: site.siteId,
            entityType: SlugEntityType.town,
            entityId: { in: missing },
            isActive: true,
          },
          select: { entityId: true, slug: true, lang: true },
          orderBy: { updatedAt: "desc" },
        });
        assignMissingSlugs(slugById, fallbacks);
      }
    }

    let siteGaMeasurementId: string | null = null;
    try {
      const siteRow = await this.prisma.site.findUnique({
        where: { id: site.siteId },
        select: { gaMeasurementId: true },
      });
      siteGaMeasurementId = siteRow?.gaMeasurementId ?? null;
    } catch {
      siteGaMeasurementId = null;
    }

    const items = towns.map((town) => {
      const tr =
        town.translations.find((t) => t.lang === site.lang) ||
        town.translations.find((t) => t.lang === "hu") ||
        town.translations[0];
      const name = tr?.name || town.id;
      return {
        id: town.id,
        slug: slugById.get(town.id) || generateSlug(name) || town.id,
        name,
        description: tr?.description ?? null,
        heroImage: tr?.heroImage ?? null,
        lat: town.lat,
        lng: town.lng,
        placeCount: town._count.places,
        // Town > Site for town explore pages (no platform fallback).
        gaMeasurementId: resolveGaMeasurementId(town.gaMeasurementId, siteGaMeasurementId),
      };
    });

    return {
      isRegion: items.length > 1,
      towns: items,
    };
  }
}

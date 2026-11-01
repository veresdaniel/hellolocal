import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { SlugEntityType } from "@prisma/client";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "../common/language-code";
import { assertHostnameAvailable } from "../common/assert-hostname-available";
import { normalizeGaMeasurementId } from "../common/ga-measurement-id";
import { generateSlug } from "../slug/slug.helper";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { assertSiteAllowsCustomDomain } from "../entitlements/assert-custom-domain-allowed";
import { SitemapService } from "../seo/sitemap.service";

export interface CreateTownDto {
  /**
   * Optional region (Site). Null/omitted = standalone town.
   * Places under a town still require Place.siteId (tenant scope) — that denormalized
   * FK is independent of Town.siteId and is rewritten only when the town is assigned
   * to a (new) region, not cleared when the town becomes standalone.
   */
  siteId?: string | null;
  /** Optional custom hostname for this town. */
  customDomain?: string | null;
  /** GA4 measurement ID (G-…). Empty string or null disables / inherits Site. */
  gaMeasurementId?: string | null;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
}

export interface UpdateTownDto {
  /** Optional region (Site). Pass null to clear region assignment. */
  siteId?: string | null;
  /** Optional custom hostname for this town. Pass null/empty to clear. */
  customDomain?: string | null;
  /** GA4 measurement ID (G-…). Empty string or null clears / inherits Site. */
  gaMeasurementId?: string | null;
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
}

export type FindTownsOptions = {
  /**
   * When true with a siteId, also include standalone towns (siteId null).
   * Default false so standalone towns do not appear under every régió list.
   */
  includeStandalone?: boolean;
  /** When true, return only standalone towns (ignores siteId). Unassigned bucket. */
  standaloneOnly?: boolean;
};

@Injectable()
export class AdminTownService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
    private readonly sitemapService: SitemapService
  ) {}

  /**
   * List towns for admin.
   * - Normal régió context: only towns with that siteId (no standalone leakage).
   * - Unassigned bucket: standaloneOnly → siteId null.
   * - Optional includeStandalone: region towns + standalones (explicit opt-in).
   */
  async findAll(
    siteId: string | null | undefined,
    page?: number,
    limit?: number,
    options: FindTownsOptions = {}
  ) {
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 10;
    const { includeStandalone = false, standaloneOnly = false } = options;

    let where: { siteId?: string | null; OR?: Array<{ siteId: string | null }> };
    if (standaloneOnly) {
      where = { siteId: null };
    } else if (!siteId) {
      throw new BadRequestException(
        "siteId is required unless standaloneOnly=true (unassigned towns)"
      );
    } else if (includeStandalone) {
      where = { OR: [{ siteId }, { siteId: null }] };
    } else {
      where = { siteId };
    }

    const total = await this.prisma.town.count({ where });

    const towns = await this.prisma.town.findMany({
      where,
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return {
      towns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(id: string, siteId?: string | null) {
    // Lookup by id; optional siteId scopes to that region or standalone (for edit access).
    const town = await this.prisma.town.findFirst({
      where: siteId
        ? { id, OR: [{ siteId }, { siteId: null }] }
        : { id },
      include: {
        translations: true,
      },
    });

    if (!town) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_TOWN);
    }

    return town;
  }

  async create(dto: CreateTownDto) {
    const siteId = dto.siteId || null;

    if (siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        throw new BadRequestException(ERROR_MESSAGES.NOT_FOUND_SITE ?? "Site not found");
      }
    }

    // Custom domain needs a parent region so /api/domain and site-resolve can attach site context.
    if (dto.customDomain !== undefined && String(dto.customDomain).trim() && !siteId) {
      throw new BadRequestException(
        "Egyedi domain csak régióhoz rendelt településhez adható meg."
      );
    }
    if (dto.customDomain !== undefined && String(dto.customDomain).trim() && siteId) {
      await this.assertTownDomainEntitlement(siteId);
    }

    // Placeholder owner id until create returns the real town id — uniqueness checked after create via pre-check with empty owner.
    // Use a temporary id that cannot collide; assertHostnameAvailable only skips match when owner.kind+id match.
    const customDomain =
      dto.customDomain !== undefined
        ? await assertHostnameAvailable(this.prisma, dto.customDomain, {
            kind: "town",
            townId: "__new__",
          })
        : null;

    let gaMeasurementId: string | null = null;
    if (dto.gaMeasurementId !== undefined) {
      try {
        gaMeasurementId = normalizeGaMeasurementId(dto.gaMeasurementId);
      } catch {
        throw new BadRequestException(
          "Invalid Google Analytics measurement ID. Expected format: G-XXXXXXXX"
        );
      }
    }

    const town = await this.prisma.town.create({
      data: {
        siteId,
        customDomain,
        gaMeasurementId,
        isActive: dto.isActive ?? true,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      include: {
        translations: true,
      },
    });

    if (siteId) {
      await this.ensureTownSlugs(
        siteId,
        town.id,
        town.translations.map((t) => ({ lang: t.lang, name: t.name }))
      );
    }

    this.sitemapService.invalidate();
    return town;
  }

  async update(id: string, contextSiteId: string | null | undefined, dto: UpdateTownDto) {
    const existing = await this.findOne(id, contextSiteId);

    const updateData: {
      isActive?: boolean;
      lat?: number | null;
      lng?: number | null;
      siteId?: string | null;
      customDomain?: string | null;
      gaMeasurementId?: string | null;
    } = {};

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }
    if (dto.lat !== undefined) {
      updateData.lat = dto.lat;
    }
    if (dto.lng !== undefined) {
      updateData.lng = dto.lng;
    }
    if (dto.gaMeasurementId !== undefined) {
      try {
        updateData.gaMeasurementId = normalizeGaMeasurementId(dto.gaMeasurementId);
      } catch {
        throw new BadRequestException(
          "Invalid Google Analytics measurement ID. Expected format: G-XXXXXXXX"
        );
      }
    }
    if (dto.siteId !== undefined) {
      if (dto.siteId) {
        const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
        if (!site) {
          throw new BadRequestException(ERROR_MESSAGES.NOT_FOUND_SITE ?? "Site not found");
        }
        updateData.siteId = dto.siteId;
      } else {
        updateData.siteId = null;
      }
    }

    const nextSiteId =
      dto.siteId !== undefined ? updateData.siteId ?? null : existing.siteId;
    if (dto.customDomain !== undefined) {
      const wantsDomain = String(dto.customDomain ?? "").trim();
      if (wantsDomain && !nextSiteId) {
        throw new BadRequestException(
          "Egyedi domain csak régióhoz rendelt településhez adható meg."
        );
      }
      if (wantsDomain && nextSiteId) {
        await this.assertTownDomainEntitlement(nextSiteId);
      }
      updateData.customDomain = await assertHostnameAvailable(this.prisma, dto.customDomain, {
        kind: "town",
        townId: id,
      });
    }
    // Clearing the region also clears a domain that would no longer resolve.
    if (dto.siteId !== undefined && !nextSiteId && existing.customDomain) {
      updateData.customDomain = null;
    }

    const regionChanged =
      dto.siteId !== undefined && (existing.siteId ?? null) !== (nextSiteId ?? null);

    await this.prisma.$transaction(async (tx) => {
      await tx.town.update({
        where: { id },
        data: updateData,
      });

      // Cascade denormalized Place/Event.siteId when town is assigned/moved to a region.
      // Detach (siteId → null): Place.siteId stays required — keep last region FK (tenant scope).
      // Places remain queryable under that site; geo parent is still townId.
      if (regionChanged && nextSiteId) {
        const placeIds = (
          await tx.place.findMany({
            where: { townId: id },
            select: { id: true },
          })
        ).map((p) => p.id);
        if (placeIds.length > 0) {
          await tx.place.updateMany({
            where: { id: { in: placeIds } },
            data: { siteId: nextSiteId },
          });
          await tx.event.updateMany({
            where: { placeId: { in: placeIds } },
            data: { siteId: nextSiteId },
          });
        }
      }
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.townTranslation.upsert({
          where: {
            townId_lang: {
              townId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            townId: id,
            lang: translation.lang,
            name: translation.name,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
        });
      }
    }

    const updated = await this.findOne(id);
    if (updated.siteId) {
      await this.ensureTownSlugs(
        updated.siteId,
        updated.id,
        updated.translations.map((t) => ({ lang: t.lang, name: t.name }))
      );
    }

    this.sitemapService.invalidate();
    return updated;
  }

  /** Town customDomain inherits the parent Site's plan domain entitlement. */
  private async assertTownDomainEntitlement(siteId: string) {
    const ent = await this.entitlementsService.getBySiteId(siteId);
    assertSiteAllowsCustomDomain(
      ent,
      "A régió csomagja nem engedi a saját domaint (település domain a régió jogosultságát örökli)."
    );
  }

  /**
   * Ensure each translation language has a primary public Slug for the town.
   * Required for /telepules/:slug filtering and town custom-domain redirects.
   */
  private async ensureTownSlugs(
    siteId: string,
    townId: string,
    translations: Array<{ lang: string; name: string }>
  ) {
    const fallbackName =
      translations.find((t) => t.lang === "hu")?.name || translations[0]?.name || townId;

    for (const translation of translations) {
      const lang = translation.lang;
      const existingSlug = await this.prisma.slug.findFirst({
        where: {
          siteId,
          lang,
          entityType: SlugEntityType.town,
          entityId: townId,
        },
      });
      if (existingSlug) continue;

      const baseSlug = generateSlug(translation.name || fallbackName) || `town-${townId}`;
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const conflict = await this.prisma.slug.findFirst({
          where: { siteId, lang, slug },
        });
        if (!conflict) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      await this.prisma.slug.create({
        data: {
          siteId,
          lang,
          slug,
          entityType: SlugEntityType.town,
          entityId: townId,
          isPrimary: true,
          isActive: true,
        },
      });
    }
  }

  async remove(id: string, siteId?: string | null) {
    await this.findOne(id, siteId);

    const placesCount = await this.prisma.place.count({
      where: { townId: id },
    });

    if (placesCount > 0) {
      throw new BadRequestException(
        `Cannot delete town: it is used by ${placesCount} place(s). Deactivate it instead.`
      );
    }

    await this.prisma.town.delete({
      where: { id },
    });

    this.sitemapService.invalidate();
    return { message: "Town deleted successfully" };
  }
}

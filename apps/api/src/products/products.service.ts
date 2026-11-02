import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SlugEntityType, UserRole } from "@prisma/client";
import { Lang } from "../common/language-code";
import { PrismaService } from "../prisma/prisma.service";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";
import { requireLang } from "../common/lang";
import { isMissingProductClickTable } from "../analytics/product-click-table";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { RbacService } from "../auth/rbac.service";

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_MAX = 60;

export type ProductTranslationInput = {
  lang: Lang;
  name: string;
  description?: string | null;
};

export type ProductWriteInput = {
  placeId: string;
  price?: number;
  currency?: string;
  imageUrl?: string | null;
  category?: string;
  isActive?: boolean;
  sortOrder?: number;
  translations: ProductTranslationInput[];
};

type Actor = { id: string; role: UserRole; siteIds?: string[] };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteResolver: SiteKeyResolverService,
    private readonly rbac: RbacService
  ) {}

  async listPublic(args: {
    lang: string;
    siteKey?: string;
    category?: string;
    placeId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const lang = requireLang(args.lang);
    const site = await this.siteResolver.resolve({ lang: args.lang, siteKey: args.siteKey });
    const page = Math.max(1, Math.floor(args.page || 1));
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Math.floor(args.pageSize || PAGE_SIZE_DEFAULT)));
    const category = args.category?.trim() || "";
    const query = args.q?.trim() || "";

    const where = {
      siteId: site.siteId,
      isActive: true,
      ...(category ? { category } : {}),
      ...(args.placeId ? { placeId: args.placeId } : {}),
      ...(query
        ? {
            translations: {
              some: {
                lang,
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  { description: { contains: query, mode: "insensitive" as const } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows, categories] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          translations: true,
          place: { include: { translations: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.findMany({
        where: { siteId: site.siteId, isActive: true, category: { not: "" } },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
    ]);

    const placeIds = rows.map((row) => row.placeId).filter((id): id is string => Boolean(id));
    const slugs = placeIds.length
      ? await this.prisma.slug.findMany({
          where: {
            siteId: site.siteId,
            lang,
            entityType: SlugEntityType.place,
            entityId: { in: placeIds },
            isActive: true,
          },
          select: { entityId: true, slug: true, isPrimary: true },
        })
      : [];
    const slugByPlace = new Map<string, string>();
    for (const slug of slugs) {
      if (!slugByPlace.has(slug.entityId) || slug.isPrimary) slugByPlace.set(slug.entityId, slug.slug);
    }

    return {
      items: rows.map((row) => ({
        ...this.toPublic(row, lang),
        placeSlug: row.placeId ? slugByPlace.get(row.placeId) || null : null,
      })),
      total,
      page,
      pageSize,
      categories: categories.map((row) => row.category),
    };
  }

  async listAdmin(siteId: string | undefined, actor: Actor, q?: string, placeId?: string) {
    const resolvedSiteId = await this.resolveAdminSite(actor, siteId);
    const placeFilter = await this.productReadFilter(actor, resolvedSiteId, placeId);
    const query = q?.trim() || "";
    const scopedPlaceId = placeId?.trim() || "";
    const rows = await this.prisma.product.findMany({
      where: {
        siteId: resolvedSiteId,
        ...(placeFilter ? { place: placeFilter } : {}),
        ...(scopedPlaceId ? { placeId: scopedPlaceId } : {}),
        ...(query
          ? {
              translations: {
                some: { name: { contains: query, mode: "insensitive" } },
              },
            }
          : {}),
      },
      include: { translations: true, place: { include: { translations: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const clicks = await this.clickTotals(rows.map((row) => row.id));
    return rows.map((row) => this.toAdmin(row, clicks.get(row.id) ?? 0));
  }

  async create(siteId: string | undefined, input: ProductWriteInput, actor: Actor) {
    const resolvedSiteId = await this.resolveAdminSite(actor, siteId);
    await this.assertProductWrite(actor, resolvedSiteId, input.placeId);
    const data = await this.normalize(resolvedSiteId, input);
    const created = await this.prisma.product.create({
      data: {
        siteId: resolvedSiteId,
        ...data.product,
        translations: { create: data.translations },
      },
      include: { translations: true, place: { include: { translations: true } } },
    });
    return this.toAdmin(created, 0);
  }

  async update(id: string, siteId: string | undefined, input: ProductWriteInput, actor: Actor) {
    const resolvedSiteId = await this.resolveAdminSite(actor, siteId);
    const existing = await this.prisma.product.findFirst({ where: { id, siteId: resolvedSiteId } });
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_PRODUCT);
    await this.assertProductWrite(actor, resolvedSiteId, existing.placeId);
    await this.assertProductWrite(actor, resolvedSiteId, input.placeId);
    const data = await this.normalize(resolvedSiteId, input);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data.product,
        translations: {
          deleteMany: {},
          create: data.translations,
        },
      },
      include: { translations: true, place: { include: { translations: true } } },
    });
    const clicks = await this.clickTotals([updated.id]);
    return this.toAdmin(updated, clicks.get(updated.id) ?? 0);
  }

  async remove(id: string, siteId: string | undefined, actor: Actor) {
    const resolvedSiteId = await this.resolveAdminSite(actor, siteId);
    const existing = await this.prisma.product.findFirst({ where: { id, siteId: resolvedSiteId } });
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_PRODUCT);
    await this.assertProductWrite(actor, resolvedSiteId, existing.placeId);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  private async clickTotals(productIds: string[]) {
    const totals = new Map<string, number>();
    if (productIds.length === 0) return totals;
    try {
      const sums = await this.prisma.productClickDaily.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _sum: { clicks: true },
      });
      for (const row of sums) totals.set(row.productId, row._sum.clicks ?? 0);
    } catch (error) {
      if (!isMissingProductClickTable(error)) throw error;
    }
    return totals;
  }

  private async resolveAdminSite(actor: Actor, siteId?: string) {
    if (actor.role === UserRole.superadmin) {
      if (!siteId) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_SITE_ID_REQUIRED);
      return siteId;
    }
    return this.rbac.defaultContentSiteId(actor.id, siteId || undefined, actor.siteIds ?? []);
  }

  private async productReadFilter(actor: Actor, siteId: string, placeId?: string) {
    if (actor.role === UserRole.superadmin) return undefined;
    const scope = await this.rbac.getContentScope(actor.id);
    if (!this.rbac.canListPlaces(scope)) {
      throw new ForbiddenException("Products are outside your access");
    }
    if (placeId?.trim()) {
      const place = await this.rbac.requirePlace(actor.id, placeId.trim());
      if (place.siteId !== siteId) throw new ForbiddenException("Place is outside your access");
    }
    return this.rbac.placeWhere(scope);
  }

  private async assertProductWrite(actor: Actor, siteId: string, placeId: string) {
    if (actor.role === UserRole.superadmin) return;
    const place = await this.rbac.assertPlaceContentEditor(actor.id, placeId);
    if (place.siteId !== siteId) throw new ForbiddenException("Place is outside your access");
  }

  private async normalize(siteId: string, input: ProductWriteInput) {
    const translations = (input.translations || [])
      .map((row) => ({
        lang: row.lang,
        name: row.name?.trim() || "",
        description: row.description?.trim() || null,
      }))
      .filter((row) => row.name);
    if (translations.length === 0) {
      throw new BadRequestException("At least one language needs a name");
    }
    const placeId = typeof input.placeId === "string" ? input.placeId.trim() : "";
    if (!placeId) {
      throw new BadRequestException("Place is required");
    }
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, siteId },
      select: { id: true },
    });
    if (!place) throw new BadRequestException("Place does not belong to this site");
    const price = Math.max(0, Math.round(Number(input.price ?? 0)));
    if (!Number.isFinite(price)) throw new BadRequestException("Price must be a number");
    const imageUrl = input.imageUrl?.trim() || null;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      throw new BadRequestException("Image URL must start with http:// or https://");
    }
    return {
      product: {
        placeId,
        price,
        currency: (input.currency || "HUF").trim().slice(0, 8) || "HUF",
        imageUrl,
        category: (input.category || "").trim().slice(0, 80),
        isActive: input.isActive !== false,
        sortOrder: Math.round(Number(input.sortOrder ?? 0)) || 0,
      },
      translations,
    };
  }

  private toPublic(
    row: {
      id: string;
      price: number;
      currency: string;
      imageUrl: string | null;
      category: string;
      placeId: string;
      translations: { lang: Lang; name: string; description: string | null }[];
      place?: { translations: { lang: Lang; name: string }[] } | null;
    },
    lang: Lang
  ) {
    const copy = this.pickTranslation(row.translations, lang);
    const placeCopy = this.pickTranslation(row.place?.translations || [], lang);
    return {
      id: row.id,
      price: row.price,
      currency: row.currency,
      imageUrl: row.imageUrl,
      category: row.category,
      placeId: row.placeId,
      placeName: placeCopy?.name || null,
      name: copy?.name || "",
      description: copy?.description || "",
    };
  }

  private toAdmin(row: {
    id: string;
    siteId: string;
    placeId: string;
    price: number;
    currency: string;
    imageUrl: string | null;
    category: string;
    isActive: boolean;
    sortOrder: number;
    translations: { lang: Lang; name: string; description: string | null }[];
    place?: { translations: { lang: Lang; name: string }[] } | null;
  }, clicks = 0) {
    return {
      id: row.id,
      siteId: row.siteId,
      placeId: row.placeId,
      clicks,
      placeName:
        row.place?.translations?.find((item) => item.lang === Lang.hu)?.name ||
        row.place?.translations?.[0]?.name ||
        null,
      price: row.price,
      currency: row.currency,
      imageUrl: row.imageUrl,
      category: row.category,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      translations: row.translations.map((item) => ({
        lang: item.lang,
        name: item.name,
        description: item.description || "",
      })),
    };
  }

  private pickTranslation<T extends { lang: Lang }>(rows: T[], lang: Lang): T | undefined {
    return rows.find((row) => row.lang === lang) || rows.find((row) => row.lang === Lang.hu) || rows[0];
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang, PlaceCategory, PriceBand } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ListArgs = {
  lang: string;
  category?: string;
  town?: string;
  q?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(lang: string): Lang {
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException("Unsupported lang. Use hu|en|de.");
  }

  private getDefaultTenantSlug(): string {
    return process.env.DEFAULT_TENANT_SLUG ?? "etyek-budai";
  }

  async list(args: ListArgs) {
    const lang = this.normalizeLang(args.lang);
    const tenantSlug = this.getDefaultTenantSlug();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const where: any = {
      tenantId: tenant.id,
      isActive: true,
    };

    if (args.category) {
      // validate enum values loosely (keep it simple for v1)
      if (!(args.category in PlaceCategory)) {
        throw new BadRequestException(`Unsupported category: ${args.category}`);
      }
      where.category = args.category as PlaceCategory;
    }

    if (args.town) {
      where.town = { slug: args.town };
    }

    if (args.q) {
      // minimal search: name contains in the selected language translation
      where.translations = {
        some: {
          lang,
          name: { contains: args.q, mode: "insensitive" },
        },
      };
    }

    const places = await this.prisma.place.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: Math.min(Math.max(args.limit, 1), 200),
      skip: Math.max(args.offset, 0),
      include: {
        town: { select: { slug: true } },
        translations: {
          where: { lang },
          take: 1,
        },
      },
    });

    return places.map((p) => {
      const t = p.translations[0];

      return {
        id: p.id,
        slug: p.slug,
        tenantSlug: tenant.slug,
        townSlug: p.town?.slug ?? null,
        category: p.category,
        name: t?.name ?? "(missing translation)",
        description: t?.teaser ?? null,
        heroImage: p.heroImage ?? null,
        gallery: p.gallery,
        location: { lat: p.lat ?? null, lng: p.lng ?? null },
        priceBand: (p.priceBand as PriceBand | null) ?? null,
        tags: p.tags,
        rating: { avg: p.ratingAvg ?? null, count: p.ratingCount ?? null },
        seo: {
          title: t?.seoTitle ?? null,
          description: t?.seoDescription ?? null,
          image: t?.seoImage ?? null,
          keywords: t?.seoKeywords ?? [],
          canonical: null,
          robots: null,
          og: { title: null, description: null, image: null, type: "website" },
          twitter: { card: "summary_large_image", title: null, description: null, image: null },
        },
      };
    });
  }

  async detail(args: { lang: string; slug: string }) {
    const lang = this.normalizeLang(args.lang);
    const tenantSlug = this.getDefaultTenantSlug();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const place = await this.prisma.place.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: args.slug } },
      include: {
        town: { select: { slug: true } },
        translations: { where: { lang }, take: 1 },
      },
    });

    if (!place) throw new NotFoundException("Place not found");

    const t = place.translations[0];

    return {
      id: place.id,
      slug: place.slug,
      tenantSlug: tenant.slug,
      townSlug: place.town?.slug ?? null,
      category: place.category,
      name: t?.name ?? "(missing translation)",
      description: t?.description ?? null,
      heroImage: place.heroImage ?? null,
      gallery: place.gallery,
      location: { lat: place.lat ?? null, lng: place.lng ?? null },
      contact: {
        phone: t?.phone ?? null,
        email: t?.email ?? null,
        website: t?.website ?? null,
        address: t?.address ?? null,
      },
      openingHours: t?.openingHours ?? null,
      accessibility: t?.accessibility ?? null,
      priceBand: place.priceBand ?? null,
      tags: place.tags,
      extras: place.extras ?? null,
      rating: { avg: place.ratingAvg ?? null, count: place.ratingCount ?? null },
      seo: {
        title: t?.seoTitle ?? null,
        description: t?.seoDescription ?? null,
        image: t?.seoImage ?? null,
        keywords: t?.seoKeywords ?? [],
        canonical: null,
        robots: null,
        og: { title: null, description: null, image: null, type: "website" },
        twitter: { card: "summary_large_image", title: null, description: null, image: null },
      },
    };
  }
}

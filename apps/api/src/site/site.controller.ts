import { Controller, Get, Param, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SiteResolverService } from "./site-resolver.service";

@Controller("/api/public/:lang/:siteKey")
export class SiteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: SiteResolverService
  ) {}

  @Get("site")
  async site(@Param("lang") lang: string, @Param("siteKey") siteKey: string) {
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }

    const r = await this.resolver.resolveSite({ lang, siteKey });

    const site = await this.prisma.site.findUnique({
      where: { id: r.siteId },
      select: {
        id: true,
        brand: {
          select: {
            name: true,
            logoUrl: true,
            faviconUrl: true,
            theme: true,
            placeholders: true,
            mapDefaults: true,
          },
        },
        translations: {
          where: { lang: r.lang },
          take: 1,
          select: {
            name: true,
            shortDescription: true,
            description: true,
            heroImage: true,
            seoTitle: true,
            seoDescription: true,
            seoImage: true,
            seoKeywords: true,
          },
        },
        siteInstances: {
          where: { lang: r.lang },
          take: 1,
          select: { isDefault: true, mapConfig: true, features: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException("Site not found");
    }

    const t = site.translations?.[0] ?? null;
    const instance = site.siteInstances?.[0] ?? null;

    return {
      siteId: r.siteId,
      siteKey: r.siteKey,
      lang: r.lang,

      site: {
        name: t?.name ?? null,
        shortDescription: t?.shortDescription ?? null,
        description: t?.description ?? null,
        heroImage: t?.heroImage ?? null,
      },

      brand: site.brand ?? null,
      instance,

      seo: {
        title: t?.seoTitle ?? null,
        description: t?.seoDescription ?? null,
        image: t?.seoImage ?? null,
        keywords: t?.seoKeywords ?? [],
      },
    };
  }
}

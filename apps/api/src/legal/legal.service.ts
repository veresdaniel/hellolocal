import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const ALLOWED_PAGES = new Set(["imprint", "terms", "privacy"] as const);
type LegalKey = "imprint" | "terms" | "privacy";

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(lang: string): Lang {
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException("Unsupported lang. Use hu|en|de.");
  }

  private getDefaultTenantSlug(): string {
    return process.env.DEFAULT_TENANT_SLUG ?? "etyek-budai";
  }

  async getPage(args: { lang: string; page: string }) {
    const lang = this.normalizeLang(args.lang);

    if (!ALLOWED_PAGES.has(args.page as any)) {
      throw new BadRequestException("Unsupported legal page. Use imprint|terms|privacy.");
    }
    const key = args.page as LegalKey;

    const tenantSlug = this.getDefaultTenantSlug();
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const legal = await this.prisma.legalPage.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      include: { translations: { where: { lang }, take: 1 } },
    });

    if (!legal || !legal.isActive) throw new NotFoundException("Legal page not found");

    const t = legal.translations[0];
    if (!t) throw new NotFoundException("Legal page translation not found");

    return {
      key,
      title: t.title,
      content: t.content ?? "",
      seo: {
        title: t.seoTitle ?? t.title,
        description: t.seoDescription ?? null,
        image: t.seoImage ?? null,
        keywords: t.seoKeywords ?? [],
        canonical: null,
        robots: null,
        og: { title: null, description: null, image: null, type: "website" },
        twitter: { card: "summary_large_image", title: null, description: null, image: null },
      },
    };
  }
}

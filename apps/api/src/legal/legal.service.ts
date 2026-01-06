import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";

const ALLOWED_PAGES = new Set(["imprint", "terms", "privacy"] as const);
type LegalKey = "imprint" | "terms" | "privacy";

/**
 * Service for retrieving legal pages (imprint, terms, privacy).
 * Supports both single-tenant (default) and multi-tenant modes.
 */
@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolver: TenantKeyResolverService
  ) {}

  private normalizeLang(lang: string): Lang {
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException("Unsupported lang. Use hu|en|de.");
  }

  /**
   * Gets a legal page by key (imprint, terms, or privacy).
   * 
   * @param args - Page retrieval arguments
   * @param args.lang - Language code
   * @param args.page - Page key (imprint, terms, or privacy)
   * @param args.tenantKey - Optional tenant key for multi-tenant support
   * @returns Legal page data with translations and SEO
   */
  async getPage(args: { lang: string; page: string; tenantKey?: string }) {
    const lang = this.normalizeLang(args.lang);

    if (!ALLOWED_PAGES.has(args.page as any)) {
      throw new BadRequestException("Unsupported legal page. Use imprint|terms|privacy.");
    }
    const key = args.page as LegalKey;

    // Resolve tenant (either default or from tenantKey parameter)
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey: args.tenantKey });

    const legal = await this.prisma.legalPage.findUnique({
      where: { tenantId_key: { tenantId: tenant.tenantId, key } },
      include: { translations: { where: { lang: tenant.lang }, take: 1 } },
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

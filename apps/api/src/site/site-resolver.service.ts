import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

@Injectable()
export class SiteResolverService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(x: string): Lang {
    if (x === "hu" || x === "en" || x === "de") return x;
    throw new BadRequestException("Unsupported lang (use hu|en|de)");
  }

  async resolveSite(args: { lang: string; siteKey: string }) {
    const lang = this.normalizeLang(args.lang);

    // Note: Since unique constraint is now [siteId, lang, slug], we use findFirst
    // and prioritize isPrimary=true entries
    const sk = await this.prisma.siteKey.findFirst({
      where: {
        lang,
        slug: args.siteKey,
        isActive: true,
      },
      orderBy: [
        { isPrimary: "desc" }, // Primary keys first
        { createdAt: "asc" }, // Then by creation date (oldest first)
      ],
      select: { siteId: true, slug: true, isActive: true },
    });

    if (!sk || !sk.isActive) throw new NotFoundException("Site not found");

    const site = await this.prisma.site.findUnique({
      where: { id: sk.siteId },
      select: { id: true, isActive: true },
    });

    if (!site || !site.isActive) throw new NotFoundException("Site not found");

    return { lang, siteId: site.id, siteKey: sk.slug };
  }
}

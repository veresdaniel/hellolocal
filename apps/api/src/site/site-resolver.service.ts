import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireLang } from "../common/lang";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

@Injectable()
export class SiteResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSite(args: { lang: string; siteKey: string }) {
    const lang = requireLang(args.lang);

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

    if (!sk || !sk.isActive) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);

    const site = await this.prisma.site.findUnique({
      where: { id: sk.siteId },
      select: { id: true, isActive: true },
    });

    if (!site || !site.isActive) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);

    return { lang, siteId: site.id, siteKey: sk.slug };
  }
}

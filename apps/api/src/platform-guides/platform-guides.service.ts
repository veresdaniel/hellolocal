import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SitemapService } from "../seo/sitemap.service";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { PLATFORM_GUIDE_SEED } from "./platform-guides.seed";

const LANGS = ["hu", "en", "de"] as const;
type GuideLang = (typeof LANGS)[number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type GuideTranslationInput = {
  lang: string;
  title?: string;
  body?: string;
  imageUrl?: string | null;
  imageCaption?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type GuideWriteInput = {
  slug?: string;
  sortOrder?: number;
  isPublished?: boolean;
  translations?: GuideTranslationInput[];
};

function asLang(raw: string | undefined): GuideLang {
  return raw === "en" || raw === "de" ? raw : "hu";
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}

@Injectable()
export class PlatformGuidesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sitemap: SitemapService,
    private readonly platformSettings: PlatformSettingsService
  ) {}

  async onModuleInit(): Promise<void> {
    for (const seed of PLATFORM_GUIDE_SEED) {
      const existing = await this.prisma.platformGuide.findUnique({
        where: { slug: seed.slug },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await this.prisma.platformGuide.create({
          data: {
            slug: seed.slug,
            sortOrder: seed.sortOrder,
            isPublished: true,
            translations: {
              create: (["hu", "en", "de"] as const).map((lang) => {
                const row = seed.translations[lang];
                return {
                  lang,
                  title: row.title,
                  body: row.body,
                  imageUrl: row.imageUrl,
                  imageCaption: row.imageCaption,
                  seoTitle: row.seoTitle,
                  seoDescription: row.seoDescription,
                };
              }),
            },
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
  }

  async listPublic(langRaw: string | undefined) {
    const lang = asLang(langRaw);
    const guides = await this.prisma.platformGuide.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      include: { translations: true },
    });
    return guides
      .map((guide) => {
        const translation = pickTranslation(guide.translations, lang);
        if (!translation) return null;
        return {
          slug: guide.slug,
          title: translation.title,
          imageUrl: translation.imageUrl,
          imageCaption: translation.imageCaption,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  async getPublic(slug: string, langRaw: string | undefined) {
    const lang = asLang(langRaw);
    const guide = await this.prisma.platformGuide.findUnique({
      where: { slug },
      include: { translations: true },
    });
    if (!guide || !guide.isPublished) throw new NotFoundException();
    const translation = pickTranslation(guide.translations, lang);
    if (!translation) throw new NotFoundException();
    const indexable = await this.platformSettings.getLandingCrawlability();
    return {
      slug: guide.slug,
      lang,
      title: translation.title,
      body: translation.body,
      imageUrl: translation.imageUrl,
      imageCaption: translation.imageCaption,
      seoTitle: translation.seoTitle || translation.title,
      seoDescription: translation.seoDescription || "",
      indexable,
      languages: guide.translations.map((row) => row.lang),
    };
  }

  listAdmin() {
    return this.prisma.platformGuide.findMany({
      orderBy: { sortOrder: "asc" },
      include: { translations: { orderBy: { lang: "asc" } } },
    });
  }

  async getAdmin(id: string) {
    const guide = await this.prisma.platformGuide.findUnique({
      where: { id },
      include: { translations: { orderBy: { lang: "asc" } } },
    });
    if (!guide) throw new NotFoundException();
    return guide;
  }

  async create(input: GuideWriteInput) {
    const slug = cleanText(input.slug, 80);
    if (!SLUG_RE.test(slug)) {
      throw new BadRequestException("A slug kisbetű, szám és kötőjel lehet.");
    }
    const guide = await this.prisma.platformGuide.create({
      data: {
        slug,
        sortOrder: numberOr(input.sortOrder, 0),
        isPublished: input.isPublished !== false,
        translations: { create: normalizeTranslations(input.translations) },
      },
      include: { translations: true },
    });
    this.sitemap.invalidate();
    return guide;
  }

  async update(id: string, input: GuideWriteInput) {
    await this.getAdmin(id);
    const data: Prisma.PlatformGuideUpdateInput = {
      sortOrder: input.sortOrder === undefined ? undefined : numberOr(input.sortOrder, 0),
      isPublished: input.isPublished,
    };
    if (input.slug !== undefined) {
      const slug = cleanText(input.slug, 80);
      if (!SLUG_RE.test(slug)) {
        throw new BadRequestException("A slug kisbetű, szám és kötőjel lehet.");
      }
      data.slug = slug;
    }
    if (input.translations) {
      const rows = normalizeTranslations(input.translations);
      await this.prisma.$transaction([
        this.prisma.platformGuide.update({ where: { id }, data }),
        ...rows.map((row) =>
          this.prisma.platformGuideTranslation.upsert({
            where: { guideId_lang: { guideId: id, lang: row.lang } },
            create: { guideId: id, ...row },
            update: row,
          })
        ),
      ]);
    } else {
      await this.prisma.platformGuide.update({ where: { id }, data });
    }
    this.sitemap.invalidate();
    return this.getAdmin(id);
  }

  async remove(id: string) {
    await this.getAdmin(id);
    await this.prisma.platformGuide.delete({ where: { id } });
    this.sitemap.invalidate();
    return { ok: true };
  }
}

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function pickTranslation<T extends { lang: string }>(rows: T[], lang: GuideLang): T | null {
  return rows.find((row) => row.lang === lang) || rows.find((row) => row.lang === "hu") || rows[0] || null;
}

function normalizeTranslations(rows: GuideTranslationInput[] | undefined) {
  const byLang = new Map<string, GuideTranslationInput>();
  for (const row of rows ?? []) {
    if (!LANGS.includes(row.lang as GuideLang)) continue;
    byLang.set(row.lang, row);
  }
  if (!byLang.size) {
    throw new BadRequestException("Legalább egy nyelv kell.");
  }
  return [...byLang.values()].map((row) => {
    const title = cleanText(row.title, 180);
    const body = cleanText(row.body, 20000);
    if (!title || !body) {
      throw new BadRequestException("Minden megadott nyelvhez cím és szöveg kell.");
    }
    return {
      lang: row.lang,
      title,
      body,
      imageUrl: cleanText(row.imageUrl, 500) || null,
      imageCaption: cleanText(row.imageCaption, 300) || null,
      seoTitle: cleanText(row.seoTitle, 180) || null,
      seoDescription: cleanText(row.seoDescription, 320) || null,
    };
  });
}

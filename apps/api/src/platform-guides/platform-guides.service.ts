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

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANG_CODE_RE = /^[a-z]{2,8}$/;

export type GuideTranslationInput = {
  lang: string;
  slug?: string | null;
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

/** Primary subtag; empty → hu. Any UiLanguage code is accepted at runtime. */
function asLang(raw: string | undefined): string {
  const code = String(raw || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return LANG_CODE_RE.test(code) ? code : "hu";
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}

function publicSlugFor(
  guide: { slug: string; translations: Array<{ lang: string; slug: string | null }> },
  lang: string
): string {
  const row = pickTranslation(guide.translations, lang);
  const localized = row?.slug?.trim();
  return localized && SLUG_RE.test(localized) ? localized : guide.slug;
}

function slugsByLang(
  guide: { slug: string; translations: Array<{ lang: string; slug: string | null }> }
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of guide.translations) {
    const localized = row.slug?.trim();
    out[row.lang] = localized && SLUG_RE.test(localized) ? localized : guide.slug;
  }
  if (!out.hu) out.hu = guide.slug;
  return out;
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
        select: { id: true, translations: { select: { id: true, lang: true, slug: true } } },
      });
      if (!existing) {
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
                    slug: row.slug,
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
        continue;
      }

      // Backfill / refresh per-language URL slugs from seed (never wipe title/body).
      for (const lang of ["hu", "en", "de"] as const) {
        const wanted = seed.translations[lang]?.slug;
        if (!wanted || !SLUG_RE.test(wanted)) continue;
        const row = existing.translations.find((t) => t.lang === lang);
        if (row?.slug === wanted) continue;
        if (row) {
          await this.prisma.platformGuideTranslation.update({
            where: { id: row.id },
            data: { slug: wanted },
          });
        } else {
          const copy = seed.translations[lang];
          await this.prisma.platformGuideTranslation.create({
            data: {
              guideId: existing.id,
              lang,
              slug: wanted,
              title: copy.title,
              body: copy.body,
              imageUrl: copy.imageUrl,
              imageCaption: copy.imageCaption,
              seoTitle: copy.seoTitle,
              seoDescription: copy.seoDescription,
            },
          });
        }
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
          slug: publicSlugFor(guide, lang),
          title: translation.title,
          imageUrl: translation.imageUrl,
          imageCaption: translation.imageCaption,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  async getPublic(slugRaw: string, langRaw: string | undefined) {
    const lang = asLang(langRaw);
    const slug = cleanText(slugRaw, 80).toLowerCase();
    if (!SLUG_RE.test(slug)) throw new NotFoundException();

    const byLocalized = await this.prisma.platformGuide.findFirst({
      where: {
        isPublished: true,
        translations: { some: { lang, slug } },
      },
      include: { translations: true },
    });
    const byCanonical =
      byLocalized ||
      (await this.prisma.platformGuide.findFirst({
        where: { isPublished: true, slug },
        include: { translations: true },
      }));
    // Also accept another language's slug (e.g. hu slug on /en/…) then redirect to localized.
    const byAnySlug =
      byCanonical ||
      (await this.prisma.platformGuide.findFirst({
        where: {
          isPublished: true,
          translations: { some: { slug } },
        },
        include: { translations: true },
      }));

    const guide = byAnySlug;
    if (!guide) throw new NotFoundException();
    const translation = pickTranslation(guide.translations, lang);
    if (!translation) throw new NotFoundException();
    const indexable = await this.platformSettings.getLandingCrawlability();
    const publicSlug = publicSlugFor(guide, lang);
    return {
      slug: publicSlug,
      canonicalSlug: guide.slug,
      lang,
      title: translation.title,
      body: translation.body,
      imageUrl: translation.imageUrl,
      imageCaption: translation.imageCaption,
      seoTitle: translation.seoTitle || translation.title,
      seoDescription: translation.seoDescription || "",
      indexable,
      languages: guide.translations.map((row) => row.lang),
      slugsByLang: slugsByLang(guide),
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
        translations: { create: normalizeTranslations(input.translations, slug) },
      },
      include: { translations: true },
    });
    this.sitemap.invalidate();
    return guide;
  }

  async update(id: string, input: GuideWriteInput) {
    const current = await this.getAdmin(id);
    const data: Prisma.PlatformGuideUpdateInput = {
      sortOrder: input.sortOrder === undefined ? undefined : numberOr(input.sortOrder, 0),
      isPublished: input.isPublished,
    };
    let canonical = current.slug;
    if (input.slug !== undefined) {
      const slug = cleanText(input.slug, 80);
      if (!SLUG_RE.test(slug)) {
        throw new BadRequestException("A slug kisbetű, szám és kötőjel lehet.");
      }
      data.slug = slug;
      canonical = slug;
    }
    if (input.translations) {
      const rows = normalizeTranslations(input.translations, canonical);
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

function pickTranslation<T extends { lang: string }>(rows: T[], lang: string): T | null {
  return rows.find((row) => row.lang === lang) || rows.find((row) => row.lang === "hu") || rows[0] || null;
}

function normalizeTranslations(rows: GuideTranslationInput[] | undefined, fallbackSlug: string) {
  const byLang = new Map<string, GuideTranslationInput>();
  for (const row of rows ?? []) {
    const lang = asLang(row.lang);
    if (!LANG_CODE_RE.test(lang)) continue;
    byLang.set(lang, { ...row, lang });
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
    const localized = cleanText(row.slug, 80).toLowerCase();
    const slug = SLUG_RE.test(localized) ? localized : fallbackSlug;
    return {
      lang: row.lang,
      slug,
      title,
      body,
      imageUrl: cleanText(row.imageUrl, 500) || null,
      imageCaption: cleanText(row.imageCaption, 300) || null,
      seoTitle: cleanText(row.seoTitle, 180) || null,
      seoDescription: cleanText(row.seoDescription, 320) || null,
    };
  });
}

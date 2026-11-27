import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SitemapService } from "../seo/sitemap.service";
import {
  PATH_SEGMENT_KEYS,
  isPathSegmentKey,
  normalizePathSegmentSlug,
  pathSegmentsForLang,
  type PathSegmentKey,
  type PathSegmentMap,
} from "./path-segment.dict";

export type PathSegmentsPayload = {
  languages: string[];
  byLang: Record<string, PathSegmentMap>;
  /** segment → { key, langs } — same word may serve several languages for one key. */
  aliases: Record<string, { key: PathSegmentKey; langs: string[] }>;
};

const STATIC_RESERVED = new Set([
  "api",
  "assets",
  "static",
  "src",
  "www",
  "app",
  "css",
  "img",
  "admin",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "collections",
  "event",
  "products",
  "static-pages",
  "static-page",
  "offline",
  "teruletek",
]);

@Injectable()
export class PathSegmentsService implements OnModuleInit {
  private cache: { until: number; value: PathSegmentsPayload } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => SitemapService))
    private readonly sitemap?: SitemapService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAllLanguagesSeeded();
  }

  invalidate(): void {
    this.cache = null;
    this.sitemap?.invalidate();
  }

  async getPayload(): Promise<PathSegmentsPayload> {
    if (this.cache && this.cache.until > Date.now()) return this.cache.value;
    const value = await this.loadPayload();
    this.cache = { until: Date.now() + 60_000, value };
    return value;
  }

  /** Segment for one key in a language (dictionary fallback if DB empty). */
  async segmentFor(lang: string, key: PathSegmentKey): Promise<string> {
    const payload = await this.getPayload();
    const code = lang.split("-")[0].toLowerCase();
    return payload.byLang[code]?.[key] ?? pathSegmentsForLang(code)[key];
  }

  async guideSegment(lang: string): Promise<string> {
    return this.segmentFor(lang, "guide");
  }

  /**
   * Insert missing path rows for `lang` from the built-in dictionary (EN fallback).
   * Existing admin edits are kept.
   */
  async seedLanguage(lang: string): Promise<void> {
    const code = lang.split("-")[0].toLowerCase();
    const map = pathSegmentsForLang(code);
    const existing = await this.prisma.uiPathSegment.findMany({
      where: { lang: code },
      select: { key: true, segment: true },
    });
    const have = new Set(existing.map((row) => row.key));
    const rows: { lang: string; key: string; segment: string }[] = [];
    for (const key of PATH_SEGMENT_KEYS) {
      if (have.has(key)) continue;
      let segment = map[key];
      // If this slug is already used for a *different* key, suffix with lang.
      const clash = await this.segmentKeyClash(segment, key);
      if (clash || STATIC_RESERVED.has(segment)) {
        const suffixed = normalizePathSegmentSlug(`${segment}-${code}`);
        segment = suffixed || `${key.replace(".", "-")}-${code}`.slice(0, 32);
      }
      rows.push({ lang: code, key, segment });
    }
    if (!rows.length) return;
    await this.prisma.uiPathSegment.createMany({ data: rows, skipDuplicates: true });
    this.invalidate();
  }

  async ensureAllLanguagesSeeded(): Promise<void> {
    const langs = await this.prisma.uiLanguage.findMany({ select: { code: true } });
    for (const { code } of langs) {
      await this.seedLanguage(code);
    }
  }

  async listAdmin(): Promise<PathSegmentsPayload> {
    return this.getPayload();
  }

  async saveAdmin(
    lang: string,
    entries: Partial<Record<PathSegmentKey, string>>
  ): Promise<PathSegmentsPayload> {
    const code = lang.split("-")[0].toLowerCase();
    const language = await this.prisma.uiLanguage.findUnique({ where: { code } });
    if (!language) throw new BadRequestException("Ez a nyelv még nincs felvéve.");

    const updates: { key: PathSegmentKey; segment: string }[] = [];
    for (const [rawKey, rawValue] of Object.entries(entries ?? {})) {
      if (!isPathSegmentKey(rawKey)) continue;
      const segment = normalizePathSegmentSlug(String(rawValue ?? ""));
      if (!segment) {
        throw new BadRequestException(`Érvénytelen szegmens: ${rawKey}`);
      }
      if (STATIC_RESERVED.has(segment)) {
        throw new BadRequestException(`Foglalt szegmens: ${segment}`);
      }
      const clash = await this.segmentKeyClash(segment, rawKey, code);
      if (clash) {
        throw new BadRequestException(
          `A „${segment}” szegmens már a „${clash}” kulcshoz tartozik.`
        );
      }
      updates.push({ key: rawKey, segment });
    }
    if (!updates.length) throw new BadRequestException("Nincs menthető szegmens.");

    await this.prisma.$transaction(
      updates.map((row) =>
        this.prisma.uiPathSegment.upsert({
          where: { lang_key: { lang: code, key: row.key } },
          create: { lang: code, key: row.key, segment: row.segment },
          update: { segment: row.segment },
        })
      )
    );
    this.invalidate();
    return this.getPayload();
  }

  private async segmentKeyClash(
    segment: string,
    key: PathSegmentKey,
    _exceptLang?: string
  ): Promise<string | null> {
    const row = await this.prisma.uiPathSegment.findFirst({
      where: { segment, key: { not: key } },
      select: { key: true },
    });
    return row?.key ?? null;
  }

  private async loadPayload(): Promise<PathSegmentsPayload> {
    const languages = await this.prisma.uiLanguage.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { code: true },
    });
    const codes = languages.map((row) => row.code);
    const rows = await this.prisma.uiPathSegment.findMany({
      where: codes.length ? { lang: { in: codes } } : undefined,
    });
    const byLang: Record<string, PathSegmentMap> = {};
    for (const code of codes) {
      byLang[code] = { ...pathSegmentsForLang(code) };
    }
    for (const row of rows) {
      if (!isPathSegmentKey(row.key)) continue;
      if (!byLang[row.lang]) byLang[row.lang] = { ...pathSegmentsForLang(row.lang) };
      byLang[row.lang][row.key] = row.segment;
    }
    const aliases: PathSegmentsPayload["aliases"] = {};
    for (const [lang, map] of Object.entries(byLang)) {
      for (const key of PATH_SEGMENT_KEYS) {
        const segment = map[key];
        const prev = aliases[segment];
        if (!prev) {
          aliases[segment] = { key, langs: [lang] };
        } else if (prev.key === key) {
          if (!prev.langs.includes(lang)) prev.langs.push(lang);
        }
        // Conflicting key for same segment: keep the first; admin validation blocks new ones.
      }
    }
    return { languages: codes, byLang, aliases };
  }
}

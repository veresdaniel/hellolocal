import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeLanguageCode } from "../common/language-code";
import { canEditCopy } from "../auth/copy-access";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { UiTranslateService } from "./ui-translate.service";
import { PathSegmentsService } from "./path-segments.service";
import type { PathSegmentKey } from "./path-segment.dict";
import { SHIPPED_UI_LANGS, shippedUiSeedCatalogs } from "./seed-catalogs";

function assertPlatformCopyEditor(role?: string | null) {
  if (!canEditCopy({ role }, "platform")) {
    throw new ForbiddenException("Only a superadmin can edit platform UI copy");
  }
}

const PREFIXES = [
  "admin",
  "public",
  "common",
  "cookieConsent",
  "error",
  "offline",
  "validation",
  "underConstruction",
] as const;
const FALLBACK = "hu";

export type UiCatalogs = Record<string, Record<string, string>>;

function isMessageKey(key: string): boolean {
  if (!key || key.length > 180 || /\s/.test(key)) return false;
  return PREFIXES.some((prefix) => key.startsWith(`${prefix}.`) && key.length > prefix.length + 1);
}

@Injectable()
export class UiCopyService implements OnModuleInit {
  private readonly logger = new Logger(UiCopyService.name);
  private cache = new Map<string, { until: number; body: { languages: string[]; messages: Record<string, string> } }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: UiTranslateService,
    private readonly pathSegments: PathSegmentsService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureShippedLanguagesSeeded();
    } catch (err) {
      this.logger.warn(
        `UiMessage boot seed skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Ensure hu/en/de exist and insert missing UiMessage rows from the shipped
   * locale catalog (admin namespace excluded). Never overwrites existing edits.
   */
  async ensureShippedLanguagesSeeded(): Promise<{ inserted: number }> {
    await this.prisma.uiLanguage.createMany({
      data: SHIPPED_UI_LANGS.map((code, index) => ({ code, sortOrder: index })),
      skipDuplicates: true,
    });
    const result = await this.applyCatalogSync(shippedUiSeedCatalogs(), "missing");
    this.logger.log(
      `UiMessage seed: languages=${SHIPPED_UI_LANGS.join(",")} inserted≈${result.inserted}`
    );
    await this.pathSegments.ensureAllLanguagesSeeded();
    return { inserted: result.inserted };
  }

  private clearCache() {
    this.cache.clear();
  }

  /** Drop the 30s public ui-copy cache (e.g. after feature-matrix sync). */
  invalidatePublicCache() {
    this.clearCache();
  }

  private async languageCodes(): Promise<string[]> {
    const rows = await this.prisma.uiLanguage.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] });
    return rows.map((row) => row.code);
  }

  async languages() {
    return { languages: await this.languageCodes() };
  }

  async publicMessages(lang: string) {
    const code = normalizeLanguageCode(lang) ?? FALLBACK;
    const cached = this.cache.get(code);
    if (cached && cached.until > Date.now()) return cached.body;
    const languages = await this.languageCodes();
    const rows = await this.prisma.uiMessage.findMany({
      where: { lang: code },
      select: { key: true, value: true },
    });
    const messages: Record<string, string> = {};
    for (const row of rows) messages[row.key] = row.value;
    const body = { languages, messages };
    this.cache.set(code, { until: Date.now() + 30_000, body });
    return body;
  }

  async editorMessages(lang: string) {
    const code = normalizeLanguageCode(lang);
    if (!code) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_LANG);
    const [languages, rows, reference] = await Promise.all([
      this.languageCodes(),
      this.prisma.uiMessage.findMany({ where: { lang: code }, select: { key: true, value: true } }),
      code === FALLBACK
        ? Promise.resolve([])
        : this.prisma.uiMessage.findMany({ where: { lang: FALLBACK }, select: { key: true, value: true } }),
    ]);
    const referenceByKey = new Map(reference.map((row) => [row.key, row.value]));
    const own = new Map(rows.map((row) => [row.key, row.value]));
    const keys = [...new Set([...own.keys(), ...referenceByKey.keys()])].sort();
    return {
      languages,
      lang: code,
      entries: keys.map((key) => ({
        key,
        value: own.get(key) ?? "",
        reference: code === FALLBACK ? own.get(key) ?? "" : referenceByKey.get(key) ?? "",
      })),
    };
  }

  async addLanguage(code: string, role?: string | null) {
    assertPlatformCopyEditor(role);
    const normalized = normalizeLanguageCode(code);
    if (!normalized) throw new BadRequestException("A nyelvkód 2 vagy 3 betű, például fr vagy sk.");
    const existing = await this.prisma.uiLanguage.findUnique({ where: { code: normalized } });
    if (existing) return this.languages();
    const source = await this.prisma.uiMessage.findMany({ where: { lang: FALLBACK } });
    const max = await this.prisma.uiLanguage.aggregate({ _max: { sortOrder: true } });
    await this.prisma.$transaction([
      this.prisma.uiLanguage.create({
        data: { code: normalized, sortOrder: (max._max.sortOrder ?? 0) + 1 },
      }),
      ...(source.length
        ? [
            this.prisma.uiMessage.createMany({
              data: source.map((row) => ({ lang: normalized, key: row.key, value: row.value })),
            }),
          ]
        : []),
    ]);
    await this.pathSegments.seedLanguage(normalized);
    this.clearCache();
    const languages = await this.languages();
    // Fire-and-forget: the editor polls the job id. Failure (e.g. no API key) keeps the hu copies.
    const job = await this.translator
      .startTranslateJob(normalized, role, () => this.clearCache())
      .catch(() => null);
    return { ...languages, ...(job ? { translateJobId: job.id } : {}) };
  }

  /** Manual (re)run of the auto-translate job for one language. */
  async startTranslate(lang: string, role?: string | null) {
    assertPlatformCopyEditor(role);
    return this.translator.startTranslateJob(lang, role, () => this.clearCache());
  }

  translateJob(jobId: string, role?: string | null) {
    assertPlatformCopyEditor(role);
    return this.translator.getJob(jobId, role);
  }

  async removeLanguage(code: string, role?: string | null) {
    assertPlatformCopyEditor(role);
    const normalized = normalizeLanguageCode(code);
    if (!normalized) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_LANG);
    if (normalized === FALLBACK) {
      throw new BadRequestException("A magyar a tartalék nyelv, nem törölhető.");
    }
    await this.prisma.uiLanguage.deleteMany({ where: { code: normalized } });
    this.pathSegments.invalidate();
    this.clearCache();
    return this.languages();
  }

  pathSegmentsPublic() {
    return this.pathSegments.getPayload();
  }

  pathSegmentsAdmin(role?: string | null) {
    assertPlatformCopyEditor(role);
    return this.pathSegments.listAdmin();
  }

  savePathSegments(
    lang: string,
    entries: Partial<Record<PathSegmentKey, string>>,
    role?: string | null
  ) {
    assertPlatformCopyEditor(role);
    return this.pathSegments.saveAdmin(lang, entries);
  }

  async saveMessages(lang: string, entries: Record<string, string>, role?: string | null) {
    assertPlatformCopyEditor(role);
    const code = normalizeLanguageCode(lang);
    if (!code) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_LANG);
    const language = await this.prisma.uiLanguage.findUnique({ where: { code } });
    if (!language) throw new BadRequestException("Ez a nyelv még nincs felvéve.");
    const rows = Object.entries(entries)
      .filter(([key, value]) => isMessageKey(key) && typeof value === "string")
      .slice(0, 500)
      .map(([key, value]) => ({ lang: code, key, value: value.slice(0, 8000) }));
    if (!rows.length) return { updated: 0 };
    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.uiMessage.upsert({
          where: { lang_key: { lang: row.lang, key: row.key } },
          create: row,
          update: { value: row.value },
        })
      )
    );
    this.clearCache();
    return { updated: rows.length };
  }

  /**
   * Seed / refresh UiMessage from locale catalogs.
   * - `missing` (default): insert only — existing DB edits stay.
   * - `replace`: upsert every row in the payload (locale → DB source of truth).
   */
  async syncMissing(
    catalogs: UiCatalogs,
    role?: string | null,
    mode: "missing" | "replace" = "missing"
  ) {
    assertPlatformCopyEditor(role);
    return this.applyCatalogSync(catalogs, mode);
  }

  /** Internal catalog sync (boot seed + admin). Does not check role. */
  private async applyCatalogSync(
    catalogs: UiCatalogs,
    mode: "missing" | "replace" = "missing"
  ): Promise<{ inserted: number; updated: number; mode: "missing" | "replace" }> {
    const incoming = Object.entries(catalogs).flatMap(([lang, messages]) => {
      const code = normalizeLanguageCode(lang);
      if (!code || !messages || typeof messages !== "object") return [];
      return Object.entries(messages)
        .filter(([key, value]) => isMessageKey(key) && typeof value === "string" && value.trim())
        .map(([key, value]) => ({ lang: code, key, value: value.slice(0, 8000) }));
    });
    const codes = [...new Set(incoming.map((row) => row.lang))];
    if (!codes.length) return { inserted: 0, updated: 0, mode };
    const known = await this.prisma.uiLanguage.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    const have = new Set(known.map((row) => row.code));
    const missingLangs = codes.filter((code) => !have.has(code));
    if (missingLangs.length) {
      const max = await this.prisma.uiLanguage.aggregate({ _max: { sortOrder: true } });
      let order = (max._max.sortOrder ?? 0) + 1;
      await this.prisma.uiLanguage.createMany({
        data: missingLangs.map((code) => ({ code, sortOrder: order++ })),
        skipDuplicates: true,
      });
    }
    if (mode === "replace") {
      const chunkSize = 40;
      for (let i = 0; i < incoming.length; i += chunkSize) {
        const slice = incoming.slice(i, i + chunkSize);
        await this.prisma.$transaction(
          slice.map((row) =>
            this.prisma.uiMessage.upsert({
              where: { lang_key: { lang: row.lang, key: row.key } },
              create: row,
              update: { value: row.value },
            })
          )
        );
      }
      this.clearCache();
      return { inserted: 0, updated: incoming.length, mode };
    }
    const before = await this.prisma.uiMessage.count({
      where: { lang: { in: codes } },
    });
    await this.prisma.uiMessage.createMany({ data: incoming, skipDuplicates: true });
    const after = await this.prisma.uiMessage.count({
      where: { lang: { in: codes } },
    });
    this.clearCache();
    return { inserted: Math.max(0, after - before), updated: 0, mode };
  }
}

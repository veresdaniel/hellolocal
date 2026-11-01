import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeLanguageCode } from "../common/language-code";
import { canEditCopy } from "../auth/copy-access";

function assertPlatformCopyEditor(role?: string | null) {
  if (!canEditCopy({ role }, "platform")) {
    throw new ForbiddenException("Only a superadmin can edit platform UI copy");
  }
}

const PREFIXES = ["public", "common", "cookieConsent", "error", "offline", "validation"] as const;
const FALLBACK = "hu";

export type UiCatalogs = Record<string, Record<string, string>>;

function isMessageKey(key: string): boolean {
  if (!key || key.length > 180 || /\s/.test(key)) return false;
  return PREFIXES.some((prefix) => key.startsWith(`${prefix}.`) && key.length > prefix.length + 1);
}

@Injectable()
export class UiCopyService {
  private cache = new Map<string, { until: number; body: { languages: string[]; messages: Record<string, string> } }>();

  constructor(private readonly prisma: PrismaService) {}

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
    if (!code) throw new BadRequestException("Érvénytelen nyelvkód.");
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
    this.clearCache();
    return this.languages();
  }

  async removeLanguage(code: string, role?: string | null) {
    assertPlatformCopyEditor(role);
    const normalized = normalizeLanguageCode(code);
    if (!normalized) throw new BadRequestException("Érvénytelen nyelvkód.");
    if (normalized === FALLBACK) {
      throw new BadRequestException("A magyar a tartalék nyelv, nem törölhető.");
    }
    await this.prisma.uiLanguage.deleteMany({ where: { code: normalized } });
    this.clearCache();
    return this.languages();
  }

  async saveMessages(lang: string, entries: Record<string, string>, role?: string | null) {
    assertPlatformCopyEditor(role);
    const code = normalizeLanguageCode(lang);
    if (!code) throw new BadRequestException("Érvénytelen nyelvkód.");
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

  /** Insert catalog strings that are not in the database yet. Existing edits stay. */
  async syncMissing(catalogs: UiCatalogs, role?: string | null) {
    assertPlatformCopyEditor(role);
    const incoming = Object.entries(catalogs).flatMap(([lang, messages]) => {
      const code = normalizeLanguageCode(lang);
      if (!code || !messages || typeof messages !== "object") return [];
      return Object.entries(messages)
        .filter(([key, value]) => isMessageKey(key) && typeof value === "string" && value.trim())
        .map(([key, value]) => ({ lang: code, key, value: value.slice(0, 8000) }));
    });
    const codes = [...new Set(incoming.map((row) => row.lang))];
    if (codes.length) {
      const known = await this.prisma.uiLanguage.findMany({ where: { code: { in: codes } }, select: { code: true } });
      const have = new Set(known.map((row) => row.code));
      const missing = codes.filter((code) => !have.has(code));
      if (missing.length) {
        const max = await this.prisma.uiLanguage.aggregate({ _max: { sortOrder: true } });
        let order = (max._max.sortOrder ?? 0) + 1;
        await this.prisma.uiLanguage.createMany({
          data: missing.map((code) => ({ code, sortOrder: order++ })),
          skipDuplicates: true,
        });
      }
      await this.prisma.uiMessage.createMany({ data: incoming, skipDuplicates: true });
      this.clearCache();
    }
    return { inserted: incoming.length };
  }
}

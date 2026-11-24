// src/admin/admin-app-settings.service.ts
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "../common/language-code";
import {
  normalizeGaMeasurementId,
  PLATFORM_GA_MEASUREMENT_ID_KEY,
} from "../common/ga-measurement-id";
import {
  normalizeGtmContainerId,
  PLATFORM_GTM_CONTAINER_ID_KEY,
} from "../common/gtm-container-id";
import { encryptSecret } from "../common/secret-box";
import { CONTENT_DRAFT_API_KEY } from "./content-draft.constants";
import { UC_ACCESS_TOKEN_KEY } from "../under-construction/under-construction.constants";
import { SitemapService } from "../seo/sitemap.service";
import {
  clearPlatformPublicHostCache,
  formatPlatformPublicHosts,
  parsePlatformPublicHosts,
  PLATFORM_PUBLIC_HOST_KEY,
} from "../common/platform-public-host";
import { LIVE_DEMO_URL_KEY, normalizeLiveDemoUrl } from "../common/live-demo-url";
import {
  DEFAULT_SHARE_IMAGE_KEY,
  normalizeShareImageUrl,
} from "../common/default-share-image";
import {
  LANDING_IMAGES_KEY,
  parseLandingImages,
  serializeLandingImages,
} from "../common/landing-images";
import {
  PLATFORM_LANDING_CRAWLABLE_DEFAULT,
  PLATFORM_LANDING_CRAWLABLE_KEY,
} from "../common/platform-landing-crawlable";
import { FREE_TRIAL_DAYS_KEY, parseFreeTrialDays } from "../common/free-trial";
import {
  CURRENCY_BY_LANG_KEY,
  DEFAULT_CURRENCIES,
  normalizeCurrencyCode,
  parseCurrencyByLang,
  suggestCurrencyMeta,
  type CurrencyByLang,
} from "../common/currency";

const SECRET_SETTING_KEYS = new Set([CONTENT_DRAFT_API_KEY, UC_ACCESS_TOKEN_KEY]);
/** Secrets encrypted at rest with APP_SECRET/JWT_SECRET (AES-GCM). */
const ENCRYPTED_AT_REST_KEYS = new Set([CONTENT_DRAFT_API_KEY]);

export interface AppSettingDto {
  key: string;
  value: string;
  type?: string;
  description?: string | null;
}

@Injectable()
export class AdminAppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sitemapService: SitemapService
  ) {}

  async findAll() {
    const rows = await this.prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
    return rows.filter((row) => !SECRET_SETTING_KEYS.has(row.key));
  }

  async findOne(key: string) {
    if (SECRET_SETTING_KEYS.has(key)) return null;
    return this.prisma.appSetting.findUnique({
      where: { key },
    });
  }

  async upsert(key: string, dto: Omit<AppSettingDto, "key">) {
    // Ensure value is always a string (never undefined)
    let value = dto.value ?? "";
    if (key === PLATFORM_GA_MEASUREMENT_ID_KEY) {
      try {
        value = normalizeGaMeasurementId(value) ?? "";
      } catch {
        throw new BadRequestException(
          "Invalid Google Analytics measurement ID. Expected format: G-XXXXXXXX"
        );
      }
    }
    if (key === PLATFORM_GTM_CONTAINER_ID_KEY) {
      try {
        value = normalizeGtmContainerId(value) ?? "";
      } catch {
        throw new BadRequestException(
          "Invalid Google Tag Manager container ID. Expected format: GTM-XXXXXXX"
        );
      }
    }
    if (key === PLATFORM_PUBLIC_HOST_KEY) {
      const parsed = parsePlatformPublicHosts(value);
      if ("error" in parsed) {
        throw new BadRequestException(`Érvénytelen domain: „${parsed.error}”. Példa: hellolocal.hu`);
      }
      value = formatPlatformPublicHosts(parsed.hosts);
      clearPlatformPublicHostCache();
    }
    if (key === LIVE_DEMO_URL_KEY) {
      const parsed = normalizeLiveDemoUrl(value);
      if ("error" in parsed) {
        throw new BadRequestException(
          "Érvénytelen demócím. Teljes cím, például https://helloetyek.hu/hu, vagy útvonal, például /hu/regiok."
        );
      }
      value = parsed.url;
    }
    if (key === DEFAULT_SHARE_IMAGE_KEY) {
      const normalized = normalizeShareImageUrl(value);
      if (value.trim() && !normalized) {
        throw new BadRequestException(
          "Érvénytelen social kép URL. Teljes cím (https://…) vagy útvonal (/marketing/…)."
        );
      }
      value = normalized;
    }
    if (key === LANDING_IMAGES_KEY) {
      value = serializeLandingImages(parseLandingImages(value));
      dto.type = "json";
    }
    const secret = SECRET_SETTING_KEYS.has(key);
    if (ENCRYPTED_AT_REST_KEYS.has(key) && value) {
      value = encryptSecret(value);
    }
    const description = secret
      ? key === UC_ACCESS_TOKEN_KEY
        ? "Server-only under-construction access token"
        : "Server-only content draft credential (encrypted at rest)"
      : (dto.description ?? null);
    try {
      const result = await this.prisma.appSetting.upsert({
        where: { key },
        update: {
          value,
          type: dto.type ?? "string",
          description,
        },
        create: {
          key,
          value,
          type: dto.type ?? "string",
          description,
        },
      });
      if (secret) return { ...result, value: "" };
      return result;
    } catch (error) {
      if (secret) {
        console.error(`[AdminAppSettingsService] upsert failed for key "${key}"`);
        throw new BadRequestException("Could not store setting");
      }
      console.error(`[AdminAppSettingsService] upsert failed for key "${key}":`, error);
      throw error;
    }
  }

  /** Platform-wide GA4 ID for public platform routes. Empty = disabled. */
  async getPlatformGaMeasurementId(): Promise<string | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: PLATFORM_GA_MEASUREMENT_ID_KEY },
    });
    const value = setting?.value?.trim() ?? "";
    if (!value) return null;
    try {
      return normalizeGaMeasurementId(value);
    } catch {
      return null;
    }
  }

  /** Platform-wide GTM container for public platform hosts. Empty = disabled. */
  async getPlatformGtmContainerId(): Promise<string | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: PLATFORM_GTM_CONTAINER_ID_KEY },
    });
    const value = setting?.value?.trim() ?? "";
    if (!value) return null;
    try {
      return normalizeGtmContainerId(value);
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    return this.prisma.appSetting.delete({
      where: { key },
    });
  }

  /**
   * Inbox for municipal quote requests.
   * Only an address already stored in app settings is used.
   */
  async ensureQuoteRecipient(): Promise<string> {
    const existing = await this.prisma.appSetting.findUnique({
      where: { key: "quoteRequestRecipient" },
    });
    return existing?.value.trim() ?? "";
  }

  /**
   * Get default language setting
   */
  async getDefaultLanguage(): Promise<Lang> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "defaultLanguage" },
    });

    if (setting && (setting.value === "hu" || setting.value === "en" || setting.value === "de")) {
      return setting.value as Lang;
    }

    return Lang.hu; // Default fallback
  }

  /**
   * Set default language setting
   */
  async setDefaultLanguage(lang: Lang) {
    return this.upsert("defaultLanguage", {
      value: lang,
      type: "string",
      description: "Default language for the application",
    });
  }

  /**
   * Master crawl switch. When false, every public page is noindex and omitted from the sitemap,
   * regardless of per-site / per-entity isCrawlable flags.
   */
  async getGlobalCrawlability(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "globalCrawlability" },
    });

    if (setting && setting.type === "boolean") {
      return setting.value === "true";
    }

    return true; // Default: crawlable
  }

  /** Persist master crawl switch and bust sitemap cache. */
  async setGlobalCrawlability(isCrawlable: boolean) {
    const saved = await this.upsert("globalCrawlability", {
      value: isCrawlable ? "true" : "false",
      type: "boolean",
      description:
        "Global crawl switch. When false, every page is noindex and omitted from the sitemap, regardless of per-content switches.",
    });
    this.sitemapService.invalidate();
    return saved;
  }

  /**
   * Platform marketing landing (hellolocal.hu overview) only. Default off for gradual rollout.
   * Global off still forces this off.
   */
  async getLandingCrawlability(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: PLATFORM_LANDING_CRAWLABLE_KEY },
    });

    if (setting && setting.type === "boolean") {
      return setting.value === "true";
    }

    return PLATFORM_LANDING_CRAWLABLE_DEFAULT;
  }

  /**
   * Persist platform-landing crawl flag and invalidate sitemap cache.
   * Independent of region sites and of global crawl.
   */
  async setLandingCrawlability(isCrawlable: boolean) {
    const saved = await this.upsert(PLATFORM_LANDING_CRAWLABLE_KEY, {
      value: isCrawlable ? "true" : "false",
      type: "boolean",
      description:
        "Platform landing (hellolocal.hu /:lang) index switch. Independent of region sites and of global crawl.",
    });
    this.sitemapService.invalidate();
    return saved;
  }

  /** Free-plan trial length in days before the owner account is auto-suspended. */
  async getFreeTrialDays(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: FREE_TRIAL_DAYS_KEY },
    });
    return parseFreeTrialDays(setting?.value);
  }

  async setFreeTrialDays(days: number) {
    const value = String(parseFreeTrialDays(days));
    return this.upsert(FREE_TRIAL_DAYS_KEY, {
      value,
      type: "number",
      description:
        "Free-plan trial days after registration; when validUntil elapses the owner is auto-suspended.",
    });
  }

  /** Ensure HUF/EUR exist (idempotent). */
  async ensureDefaultCurrencies() {
    for (const row of DEFAULT_CURRENCIES) {
      await this.prisma.currency.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          name: row.name,
          plural: row.plural,
          symbol: row.symbol ?? null,
        },
        update: {},
      });
    }
  }

  async listCurrencies() {
    await this.ensureDefaultCurrencies();
    return this.prisma.currency.findMany({ orderBy: { code: "asc" } });
  }

  async upsertCurrency(input: {
    code: string;
    name?: string;
    plural?: string;
    symbol?: string | null;
  }) {
    const code = normalizeCurrencyCode(input.code);
    if (!code) {
      throw new BadRequestException("Invalid currency code");
    }
    const suggested = suggestCurrencyMeta(code);
    const name = (input.name ?? "").trim() || suggested.name;
    const plural = (input.plural ?? "").trim() || suggested.plural;
    const symbol =
      input.symbol === undefined
        ? suggested.symbol
        : input.symbol === null || input.symbol === ""
          ? null
          : String(input.symbol).trim();
    return this.prisma.currency.upsert({
      where: { code },
      create: { code, name, plural, symbol },
      update: { name, plural, symbol },
    });
  }

  async deleteCurrency(codeRaw: string) {
    const code = normalizeCurrencyCode(codeRaw);
    if (!code) throw new BadRequestException("Invalid currency code");
    if (code === "HUF" || code === "EUR") {
      throw new BadRequestException("Cannot delete built-in HUF or EUR");
    }
    const byLang = await this.getCurrencyByLang();
    if (Object.values(byLang).includes(code)) {
      throw new BadRequestException("Currency is assigned to a language");
    }
    await this.prisma.currency.delete({ where: { code } });
    return { ok: true };
  }

  async getCurrencyByLang(): Promise<CurrencyByLang> {
    await this.ensureDefaultCurrencies();
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: CURRENCY_BY_LANG_KEY },
    });
    return parseCurrencyByLang(setting?.value);
  }

  async setCurrencyByLang(map: CurrencyByLang) {
    await this.ensureDefaultCurrencies();
    const next = parseCurrencyByLang(JSON.stringify(map ?? {}));
    const codes = new Set((await this.listCurrencies()).map((c) => c.code));
    for (const [lang, code] of Object.entries(next)) {
      if (!codes.has(code)) {
        throw new BadRequestException(`Unknown currency for ${lang}: ${code}`);
      }
    }
    await this.upsert(CURRENCY_BY_LANG_KEY, {
      value: JSON.stringify(next),
      type: "json",
      description: "Per UI-language currency for platform landing plan cards (hu/en/de).",
    });
    return next;
  }
}

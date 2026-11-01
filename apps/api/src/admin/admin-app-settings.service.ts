// src/admin/admin-app-settings.service.ts
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "../common/language-code";
import {
  normalizeGaMeasurementId,
  PLATFORM_GA_MEASUREMENT_ID_KEY,
} from "../common/ga-measurement-id";
import { CONTENT_DRAFT_API_KEY } from "./content-draft.constants";

export interface AppSettingDto {
  key: string;
  value: string;
  type?: string;
  description?: string | null;
}

@Injectable()
export class AdminAppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
    return rows.filter((row) => row.key !== CONTENT_DRAFT_API_KEY);
  }

  async findOne(key: string) {
    if (key === CONTENT_DRAFT_API_KEY) return null;
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
    const secret = key === CONTENT_DRAFT_API_KEY;
    const description = secret ? "Server-only content draft credential" : (dto.description ?? null);
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
   * Get global crawlability setting
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

  /**
   * Set global crawlability setting
   */
  async setGlobalCrawlability(isCrawlable: boolean) {
    return this.upsert("globalCrawlability", {
      value: isCrawlable ? "true" : "false",
      type: "boolean",
      description:
        "Global platform crawlability setting. If false, all pages will have noindex meta tag by default.",
    });
  }
}

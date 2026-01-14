// src/admin/admin-app-settings.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

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
    return this.prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async findOne(key: string) {
    return this.prisma.appSetting.findUnique({
      where: { key },
    });
  }

  async upsert(key: string, dto: Omit<AppSettingDto, "key">) {
    // Ensure value is always a string (never undefined)
    const value = dto.value ?? "";
    try {
      const result = await this.prisma.appSetting.upsert({
        where: { key },
        update: {
          value,
          type: dto.type ?? "string",
          description: dto.description ?? null,
        },
        create: {
          key,
          value,
          type: dto.type ?? "string",
          description: dto.description ?? null,
        },
      });
      return result;
    } catch (error) {
      console.error(`[AdminAppSettingsService] upsert failed for key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string) {
    return this.prisma.appSetting.delete({
      where: { key },
    });
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
      description: "Global platform crawlability setting. If false, all pages will have noindex meta tag by default.",
    });
  }

}


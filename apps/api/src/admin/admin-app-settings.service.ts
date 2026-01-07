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
    return this.prisma.appSetting.upsert({
      where: { key },
      update: {
        value: dto.value,
        type: dto.type ?? "string",
        description: dto.description ?? null,
      },
      create: {
        key,
        value: dto.value,
        type: dto.type ?? "string",
        description: dto.description ?? null,
      },
    });
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
   * Get map settings for a tenant
   */
  async getMapSettings(tenantId: string) {
    const townIdSetting = await this.findOne(`mapDefaultTownId_${tenantId}`);
    const latSetting = await this.findOne(`mapDefaultLat_${tenantId}`);
    const lngSetting = await this.findOne(`mapDefaultLng_${tenantId}`);
    const zoomSetting = await this.findOne(`mapDefaultZoom_${tenantId}`);

    return {
      townId: townIdSetting?.value || null,
      lat: latSetting ? parseFloat(latSetting.value) : null,
      lng: lngSetting ? parseFloat(lngSetting.value) : null,
      zoom: zoomSetting ? parseFloat(zoomSetting.value) : null,
    };
  }

  /**
   * Set map settings for a tenant
   */
  async setMapSettings(tenantId: string, settings: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  }) {
    const updates: Promise<any>[] = [];

    if (settings.townId !== undefined) {
      if (settings.townId) {
        updates.push(this.upsert(`mapDefaultTownId_${tenantId}`, {
          value: settings.townId,
          type: "string",
          description: `Default town ID for map center (tenant: ${tenantId})`,
        }));
      } else {
        // Delete if set to null
        try {
          await this.delete(`mapDefaultTownId_${tenantId}`);
        } catch {
          // Ignore if doesn't exist
        }
      }
    }

    if (settings.lat !== undefined) {
      if (settings.lat !== null) {
        updates.push(this.upsert(`mapDefaultLat_${tenantId}`, {
          value: settings.lat.toString(),
          type: "number",
          description: `Default latitude for map center (tenant: ${tenantId})`,
        }));
      } else {
        try {
          await this.delete(`mapDefaultLat_${tenantId}`);
        } catch {
          // Ignore
        }
      }
    }

    if (settings.lng !== undefined) {
      if (settings.lng !== null) {
        updates.push(this.upsert(`mapDefaultLng_${tenantId}`, {
          value: settings.lng.toString(),
          type: "number",
          description: `Default longitude for map center (tenant: ${tenantId})`,
        }));
      } else {
        try {
          await this.delete(`mapDefaultLng_${tenantId}`);
        } catch {
          // Ignore
        }
      }
    }

    if (settings.zoom !== undefined) {
      if (settings.zoom !== null) {
        updates.push(this.upsert(`mapDefaultZoom_${tenantId}`, {
          value: settings.zoom.toString(),
          type: "number",
          description: `Default zoom level for map (tenant: ${tenantId})`,
        }));
      } else {
        try {
          await this.delete(`mapDefaultZoom_${tenantId}`);
        } catch {
          // Ignore
        }
      }
    }

    await Promise.all(updates);
    return this.getMapSettings(tenantId);
  }

  /**
   * Get site settings (site name, description, SEO)
   */
  async getSiteSettings() {
    const siteNameHu = await this.findOne("siteName_hu");
    const siteNameEn = await this.findOne("siteName_en");
    const siteNameDe = await this.findOne("siteName_de");
    const siteDescriptionHu = await this.findOne("siteDescription_hu");
    const siteDescriptionEn = await this.findOne("siteDescription_en");
    const siteDescriptionDe = await this.findOne("siteDescription_de");
    const seoTitleHu = await this.findOne("seoTitle_hu");
    const seoTitleEn = await this.findOne("seoTitle_en");
    const seoTitleDe = await this.findOne("seoTitle_de");
    const seoDescriptionHu = await this.findOne("seoDescription_hu");
    const seoDescriptionEn = await this.findOne("seoDescription_en");
    const seoDescriptionDe = await this.findOne("seoDescription_de");

    return {
      siteName: {
        hu: siteNameHu?.value || "HelloLocal",
        en: siteNameEn?.value || "HelloLocal",
        de: siteNameDe?.value || "HelloLocal",
      },
      siteDescription: {
        hu: siteDescriptionHu?.value || "",
        en: siteDescriptionEn?.value || "",
        de: siteDescriptionDe?.value || "",
      },
      seoTitle: {
        hu: seoTitleHu?.value || "",
        en: seoTitleEn?.value || "",
        de: seoTitleDe?.value || "",
      },
      seoDescription: {
        hu: seoDescriptionHu?.value || "",
        en: seoDescriptionEn?.value || "",
        de: seoDescriptionDe?.value || "",
      },
    };
  }

  /**
   * Set site settings
   */
  async setSiteSettings(settings: {
    siteName?: { hu?: string; en?: string; de?: string };
    siteDescription?: { hu?: string; en?: string; de?: string };
    seoTitle?: { hu?: string; en?: string; de?: string };
    seoDescription?: { hu?: string; en?: string; de?: string };
  }) {
    const updates: Promise<any>[] = [];

    if (settings.siteName) {
      if (settings.siteName.hu !== undefined) {
        updates.push(this.upsert("siteName_hu", {
          value: settings.siteName.hu,
          type: "string",
          description: "Site name in Hungarian",
        }));
      }
      if (settings.siteName.en !== undefined) {
        updates.push(this.upsert("siteName_en", {
          value: settings.siteName.en,
          type: "string",
          description: "Site name in English",
        }));
      }
      if (settings.siteName.de !== undefined) {
        updates.push(this.upsert("siteName_de", {
          value: settings.siteName.de,
          type: "string",
          description: "Site name in German",
        }));
      }
    }

    if (settings.siteDescription) {
      if (settings.siteDescription.hu !== undefined) {
        updates.push(this.upsert("siteDescription_hu", {
          value: settings.siteDescription.hu,
          type: "string",
          description: "Site description in Hungarian",
        }));
      }
      if (settings.siteDescription.en !== undefined) {
        updates.push(this.upsert("siteDescription_en", {
          value: settings.siteDescription.en,
          type: "string",
          description: "Site description in English",
        }));
      }
      if (settings.siteDescription.de !== undefined) {
        updates.push(this.upsert("siteDescription_de", {
          value: settings.siteDescription.de,
          type: "string",
          description: "Site description in German",
        }));
      }
    }

    if (settings.seoTitle) {
      if (settings.seoTitle.hu !== undefined) {
        updates.push(this.upsert("seoTitle_hu", {
          value: settings.seoTitle.hu,
          type: "string",
          description: "Default SEO title in Hungarian",
        }));
      }
      if (settings.seoTitle.en !== undefined) {
        updates.push(this.upsert("seoTitle_en", {
          value: settings.seoTitle.en,
          type: "string",
          description: "Default SEO title in English",
        }));
      }
      if (settings.seoTitle.de !== undefined) {
        updates.push(this.upsert("seoTitle_de", {
          value: settings.seoTitle.de,
          type: "string",
          description: "Default SEO title in German",
        }));
      }
    }

    if (settings.seoDescription) {
      if (settings.seoDescription.hu !== undefined) {
        updates.push(this.upsert("seoDescription_hu", {
          value: settings.seoDescription.hu,
          type: "string",
          description: "Default SEO description in Hungarian",
        }));
      }
      if (settings.seoDescription.en !== undefined) {
        updates.push(this.upsert("seoDescription_en", {
          value: settings.seoDescription.en,
          type: "string",
          description: "Default SEO description in English",
        }));
      }
      if (settings.seoDescription.de !== undefined) {
        updates.push(this.upsert("seoDescription_de", {
          value: settings.seoDescription.de,
          type: "string",
          description: "Default SEO description in German",
        }));
      }
    }

    await Promise.all(updates);
    return this.getSiteSettings();
  }
}


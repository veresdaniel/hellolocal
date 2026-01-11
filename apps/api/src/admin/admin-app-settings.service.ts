// src/admin/admin-app-settings.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";
import { isValidImageUrl, sanitizeImageUrl } from "../common/url-validation";

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
    console.log(`[AdminAppSettingsService] upsert called for key "${key}" with value:`, value);
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
      console.log(`[AdminAppSettingsService] upsert successful for key "${key}":`, result);
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
   * Get site settings (site name, description, SEO) for a tenant
   */
  async getSiteSettings(tenantId: string) {
    // Fetch all settings in parallel for better performance
    // All keys are now tenant-specific
    const [
      siteNameHu,
      siteNameEn,
      siteNameDe,
      siteDescriptionHu,
      siteDescriptionEn,
      siteDescriptionDe,
      seoTitleHu,
      seoTitleEn,
      seoTitleDe,
      seoDescriptionHu,
      seoDescriptionEn,
      seoDescriptionDe,
      isCrawlableSetting,
      defaultPlaceholderCardImage,
      defaultPlaceholderDetailHeroImage,
      brandBadgeIcon,
      faviconUrl,
    ] = await Promise.all([
      this.findOne(`siteName_hu_${tenantId}`),
      this.findOne(`siteName_en_${tenantId}`),
      this.findOne(`siteName_de_${tenantId}`),
      this.findOne(`siteDescription_hu_${tenantId}`),
      this.findOne(`siteDescription_en_${tenantId}`),
      this.findOne(`siteDescription_de_${tenantId}`),
      this.findOne(`seoTitle_hu_${tenantId}`),
      this.findOne(`seoTitle_en_${tenantId}`),
      this.findOne(`seoTitle_de_${tenantId}`),
      this.findOne(`seoDescription_hu_${tenantId}`),
      this.findOne(`seoDescription_en_${tenantId}`),
      this.findOne(`seoDescription_de_${tenantId}`),
      this.findOne(`isCrawlable_${tenantId}`),
      this.findOne(`defaultPlaceholderCardImage_${tenantId}`),
      this.findOne(`defaultPlaceholderDetailHeroImage_${tenantId}`),
      this.findOne(`brandBadgeIcon_${tenantId}`),
      this.findOne(`faviconUrl_${tenantId}`),
    ]);

    return {
      siteName: {
        hu: siteNameHu?.value ?? "HelloLocal",
        en: siteNameEn?.value ?? "HelloLocal",
        de: siteNameDe?.value ?? "HelloLocal",
      },
      siteDescription: {
        hu: siteDescriptionHu?.value ?? "",
        en: siteDescriptionEn?.value ?? "",
        de: siteDescriptionDe?.value ?? "",
      },
      seoTitle: {
        hu: seoTitleHu?.value ?? "",
        en: seoTitleEn?.value ?? "",
        de: seoTitleDe?.value ?? "",
      },
      seoDescription: {
        hu: seoDescriptionHu?.value ?? "",
        en: seoDescriptionEn?.value ?? "",
        de: seoDescriptionDe?.value ?? "",
      },
      isCrawlable: isCrawlableSetting?.value === "true" || isCrawlableSetting?.value === "1" || isCrawlableSetting === null, // Default to true if not set
      defaultPlaceholderCardImage: defaultPlaceholderCardImage?.value && defaultPlaceholderCardImage.value.trim() !== "" ? defaultPlaceholderCardImage.value : null,
      defaultPlaceholderDetailHeroImage: defaultPlaceholderDetailHeroImage?.value && defaultPlaceholderDetailHeroImage.value.trim() !== "" ? defaultPlaceholderDetailHeroImage.value : null,
      brandBadgeIcon: brandBadgeIcon?.value && brandBadgeIcon.value.trim() !== "" ? brandBadgeIcon.value : null,
      faviconUrl: faviconUrl?.value && faviconUrl.value.trim() !== "" ? faviconUrl.value : null,
    };
  }

  /**
   * Set site settings for a tenant
   */
  async setSiteSettings(tenantId: string, settings: {
    siteName?: { hu?: string; en?: string; de?: string };
    siteDescription?: { hu?: string; en?: string; de?: string };
    seoTitle?: { hu?: string; en?: string; de?: string };
    seoDescription?: { hu?: string; en?: string; de?: string };
    isCrawlable?: boolean;
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    brandBadgeIcon?: string | null;
    faviconUrl?: string | null;
  }) {
    console.log('[AdminAppSettingsService] setSiteSettings called with:', JSON.stringify(settings, null, 2));
    console.log('[AdminAppSettingsService] Checking which fields are defined:', {
      siteName: settings.siteName !== undefined,
      siteDescription: settings.siteDescription !== undefined,
      seoTitle: settings.seoTitle !== undefined,
      seoDescription: settings.seoDescription !== undefined,
      isCrawlable: settings.isCrawlable !== undefined,
      defaultPlaceholderCardImage: settings.defaultPlaceholderCardImage !== undefined,
      defaultPlaceholderDetailHeroImage: settings.defaultPlaceholderDetailHeroImage !== undefined,
      brandBadgeIcon: settings.brandBadgeIcon !== undefined,
      faviconUrl: settings.faviconUrl !== undefined,
    });
    const updates: Promise<any>[] = [];

    // Note: Frontend always sends all fields, so we don't need to get current values
    // We'll save whatever the frontend sends

    if (settings.siteName !== undefined) {
      // Always save the provided values directly - frontend always sends all fields
      const huValue = settings.siteName.hu ?? "HelloLocal";
      const enValue = settings.siteName.en ?? "HelloLocal";
      const deValue = settings.siteName.de ?? "HelloLocal";
      console.log('[AdminAppSettingsService] Saving siteName:', { hu: huValue, en: enValue, de: deValue });
      updates.push(this.upsert("siteName_hu", {
        value: huValue,
        type: "string",
        description: "Site name in Hungarian",
      }));
      updates.push(this.upsert("siteName_en", {
        value: enValue,
        type: "string",
        description: "Site name in English",
      }));
      updates.push(this.upsert("siteName_de", {
        value: deValue,
        type: "string",
        description: "Site name in German",
      }));
    }

    if (settings.siteDescription !== undefined) {
      // Always save the provided values directly - frontend always sends all fields
      updates.push(this.upsert(`siteDescription_hu_${tenantId}`, {
        value: settings.siteDescription.hu ?? "",
        type: "string",
        description: "Site description in Hungarian",
      }));
      updates.push(this.upsert(`siteDescription_en_${tenantId}`, {
        value: settings.siteDescription.en ?? "",
        type: "string",
        description: "Site description in English",
      }));
      updates.push(this.upsert(`siteDescription_de_${tenantId}`, {
        value: settings.siteDescription.de ?? "",
        type: "string",
        description: "Site description in German",
      }));
    }

    if (settings.seoTitle !== undefined) {
      // Always save the provided values directly - frontend always sends all fields
      updates.push(this.upsert(`seoTitle_hu_${tenantId}`, {
        value: settings.seoTitle.hu ?? "",
        type: "string",
        description: "Default SEO title in Hungarian",
      }));
      updates.push(this.upsert(`seoTitle_en_${tenantId}`, {
        value: settings.seoTitle.en ?? "",
        type: "string",
        description: "Default SEO title in English",
      }));
      updates.push(this.upsert(`seoTitle_de_${tenantId}`, {
        value: settings.seoTitle.de ?? "",
        type: "string",
        description: "Default SEO title in German",
      }));
    }

    if (settings.seoDescription !== undefined) {
      // Always save the provided values directly - frontend always sends all fields
      updates.push(this.upsert(`seoDescription_hu_${tenantId}`, {
        value: settings.seoDescription.hu ?? "",
        type: "string",
        description: "Default SEO description in Hungarian",
      }));
      updates.push(this.upsert(`seoDescription_en_${tenantId}`, {
        value: settings.seoDescription.en ?? "",
        type: "string",
        description: "Default SEO description in English",
      }));
      updates.push(this.upsert(`seoDescription_de_${tenantId}`, {
        value: settings.seoDescription.de ?? "",
        type: "string",
        description: "Default SEO description in German",
      }));
    }

    if (settings.isCrawlable !== undefined) {
      updates.push(this.upsert("isCrawlable", {
        value: settings.isCrawlable ? "true" : "false",
        type: "boolean",
        description: "Whether search engines should crawl the site",
      }));
    }

    if (settings.defaultPlaceholderCardImage !== undefined) {
      // Validate and sanitize URL
      const sanitizedUrl = sanitizeImageUrl(settings.defaultPlaceholderCardImage);
      if (settings.defaultPlaceholderCardImage && settings.defaultPlaceholderCardImage.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid image URL. Only http:// and https:// URLs are allowed.");
      }
      updates.push(this.upsert(`defaultPlaceholderCardImage_${tenantId}`, {
        value: sanitizedUrl || "",
        type: "string",
        description: "Default placeholder image URL for place cards",
      }));
    }

    if (settings.defaultPlaceholderDetailHeroImage !== undefined) {
      // Validate and sanitize URL
      const sanitizedUrl = sanitizeImageUrl(settings.defaultPlaceholderDetailHeroImage);
      if (settings.defaultPlaceholderDetailHeroImage && settings.defaultPlaceholderDetailHeroImage.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid image URL. Only http:// and https:// URLs are allowed.");
      }
      updates.push(this.upsert(`defaultPlaceholderDetailHeroImage_${tenantId}`, {
        value: sanitizedUrl || "",
        type: "string",
        description: "Default placeholder hero image URL for place detail pages",
      }));
    }

    if (settings.brandBadgeIcon !== undefined) {
      // Validate and sanitize URL
      const sanitizedUrl = sanitizeImageUrl(settings.brandBadgeIcon);
      if (settings.brandBadgeIcon && settings.brandBadgeIcon.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid image URL for brand badge icon. Only http:// and https:// URLs are allowed.");
      }
      updates.push(this.upsert(`brandBadgeIcon_${tenantId}`, {
        value: sanitizedUrl || "",
        type: "string",
        description: "Brand badge icon URL",
      }));
    }

    if (settings.faviconUrl !== undefined) {
      // Validate and sanitize URL
      const sanitizedUrl = sanitizeImageUrl(settings.faviconUrl);
      if (settings.faviconUrl && settings.faviconUrl.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid favicon URL. Only http:// and https:// URLs are allowed.");
      }
      updates.push(this.upsert(`faviconUrl_${tenantId}`, {
        value: sanitizedUrl || "",
        type: "string",
        description: "Favicon URL",
      }));
    }

    console.log(`[AdminAppSettingsService] About to execute ${updates.length} updates`);
    if (updates.length === 0) {
      console.warn('[AdminAppSettingsService] WARNING: No updates to execute! This should not happen.');
    }
    await Promise.all(updates);
    console.log('[AdminAppSettingsService] Updates completed. Fetching fresh data...');
    // Return fresh data from database
    const result = await this.getSiteSettings(tenantId);
    console.log('[AdminAppSettingsService] Returning:', JSON.stringify(result, null, 2));
    return result;
  }
}


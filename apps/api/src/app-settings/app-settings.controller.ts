// src/app-settings/app-settings.controller.ts
import { Controller, Get, Param, Query, BadRequestException } from "@nestjs/common";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";

/**
 * Public controller for app settings that don't require authentication
 */
@Controller("/api")
export class AppSettingsController {
  constructor(
    private readonly appSettingsService: AdminAppSettingsService,
    private readonly tenantKeyResolver: TenantKeyResolverService
  ) {}

  /**
   * Get default language - public endpoint, no authentication required
   */
  @Get("/app-settings/default-language")
  async getDefaultLanguage() {
    const lang = await this.appSettingsService.getDefaultLanguage();
    return { defaultLanguage: lang };
  }

  /**
   * Get map settings - public endpoint, no authentication required
   * Uses lang and optional tenantKey to resolve tenant and return map settings
   */
  @Get("/:lang/map-settings")
  async getMapSettings(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    // Validate lang
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }

    // Resolve tenant from lang and tenantKey
    const resolved = await this.tenantKeyResolver.resolve({ lang, tenantKey });
    
    // Get map settings for the resolved tenant
    const settings = await this.appSettingsService.getMapSettings(resolved.tenantId);
    
    return settings;
  }

  /**
   * Get site settings - public endpoint, no authentication required
   * Returns site name, description, and SEO settings for all languages
   */
  @Get("/:lang/site-settings")
  async getSiteSettings(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    // Validate lang
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }

    // Resolve tenant
    const tenant = await this.tenantKeyResolver.resolve({ lang, tenantKey });
    
    const allSettings = await this.appSettingsService.getSiteSettings(tenant.tenantId);
    
    // Return only the requested language's settings, plus default placeholder images
    return {
      siteName: allSettings.siteName[lang as "hu" | "en" | "de"],
      siteDescription: allSettings.siteDescription[lang as "hu" | "en" | "de"],
      seoTitle: allSettings.seoTitle[lang as "hu" | "en" | "de"],
      seoDescription: allSettings.seoDescription[lang as "hu" | "en" | "de"],
      defaultPlaceholderCardImage: allSettings.defaultPlaceholderCardImage,
      defaultPlaceholderDetailHeroImage: allSettings.defaultPlaceholderDetailHeroImage,
    };
  }
}


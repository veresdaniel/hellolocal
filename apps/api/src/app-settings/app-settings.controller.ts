// src/app-settings/app-settings.controller.ts
import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { readPlatformPublicHostEntries } from "../common/platform-public-host";

/**
 * Public controller for app settings that don't require authentication
 * Excluded from rate limiting as these are frequently called during page load
 */
@Controller("/api")
@SkipThrottle({ default: true, strict: true })
export class AppSettingsController {
  constructor(
    private readonly appSettingsService: AdminAppSettingsService,
    private readonly prisma: PrismaService
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
   * Get active sites count - public endpoint, no authentication required
   * Returns the number of active sites to determine if multi-site URLs should be used
   */
  @Get("/app-settings/active-sites-count")
  async getActiveSitesCount() {
    const count = await this.prisma.site.count({
      where: { isActive: true },
    });
    return { count };
  }

  /**
   * Platform-wide GA4 measurement ID for platform public routes (overview, pricing,
   * multi-site list, login). Site routes use Site.gaMeasurementId instead — no fallback.
   */
  @Get("/app-settings/platform-ga")
  async getPlatformGa() {
    const gaMeasurementId = await this.appSettingsService.getPlatformGaMeasurementId();
    return { gaMeasurementId };
  }

  /**
   * Extra public platform hostnames. The first is the default origin.
   * hello-local.io stays available even when this list is empty.
   */
  @Get("/app-settings/platform-host")
  async getPlatformHost() {
    const entries = await readPlatformPublicHostEntries(this.prisma);
    const hosts = entries.map((entry) => entry.host);
    const host = hosts[0] ?? null;
    return { hosts, entries, host, origin: host ? `https://${host}` : null };
  }
}

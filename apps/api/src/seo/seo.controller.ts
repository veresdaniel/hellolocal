// src/seo/seo.controller.ts
import { Controller, Get, Param, Query, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";
import { SlugEntityType } from "@prisma/client";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

@Controller("/api/seo")
export class SeoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantResolver: TenantKeyResolverService,
    private readonly slugResolver: SlugResolverService,
    private readonly appSettingsService: AdminAppSettingsService
  ) {}

  /**
   * Get SEO metadata for a place or event by slug
   * This endpoint is used for SSR/pre-rendering to generate meta tags
   */
  @Get("/:lang/:type/:slug")
  async getSeoMetadata(
    @Param("lang") lang: string,
    @Param("type") type: "place" | "event",
    @Param("slug") slug: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    // Validate lang
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }

    // Resolve tenant
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey });

    // Resolve slug
    const slugResult = await this.slugResolver.resolve({
      tenantId: tenant.tenantId,
      lang: tenant.lang,
      slug,
    });

    // Verify entity type
    const expectedEntityType = type === "place" ? SlugEntityType.place : SlugEntityType.event;
    if (slugResult.entityType !== expectedEntityType) {
      throw new NotFoundException(`Entity not found or wrong type`);
    }

    // Get site settings for fallback
    const siteSettings = await this.appSettingsService.getSiteSettings();

    if (type === "place") {
      const place = await this.prisma.place.findUnique({
        where: { id: slugResult.entityId },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
        },
      });

      if (!place || !place.isActive) {
        throw new NotFoundException("Place not found");
      }

      const translation = place.translations.find((t) => t.lang === tenant.lang) ||
        place.translations.find((t) => t.lang === "hu");

      const categoryName = place.category?.translations.find((t) => t.lang === tenant.lang)?.name ||
        place.category?.translations.find((t) => t.lang === "hu")?.name;

      const siteName = siteSettings.siteName[tenant.lang as "hu" | "en" | "de"];
      const title = translation?.seoTitle || translation?.name || place.id;
      const description = translation?.seoDescription || translation?.teaser || translation?.description || "";
      // Use SEO image, then hero image, then default placeholder detail hero image
      const image = translation?.seoImage || place.heroImage || siteSettings.defaultPlaceholderDetailHeroImage || "";

      return {
        title: `${title} - ${siteName}`,
        description,
        image,
        url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}/place/${slugResult.canonicalSlug}`,
        type: "website",
        siteName,
      };
    } else {
      // Event
      const event = await this.prisma.event.findUnique({
        where: { id: slugResult.entityId },
        include: {
          translations: true,
          category: {
            include: {
              translations: true,
            },
          },
        },
      });

      if (!event || !event.isActive) {
        throw new NotFoundException("Event not found");
      }

      const translation = event.translations.find((t) => t.lang === tenant.lang) ||
        event.translations.find((t) => t.lang === "hu");

      const siteName = siteSettings.siteName[tenant.lang as "hu" | "en" | "de"];
      const title = translation?.seoTitle || translation?.title || event.id;
      const description = translation?.seoDescription || translation?.shortDescription || translation?.description || "";
      // Use SEO image, then hero image, then default placeholder detail hero image
      const image = translation?.seoImage || event.heroImage || siteSettings.defaultPlaceholderDetailHeroImage || "";

      return {
        title: `${title} - ${siteName}`,
        description,
        image,
        url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}/event/${slugResult.canonicalSlug}`,
        type: "website",
        siteName,
      };
    }
  }

  /**
   * Get SEO metadata for homepage
   */
  @Get("/:lang")
  async getHomepageSeo(
    @Param("lang") lang: string,
    @Query("tenantKey") tenantKey?: string
  ) {
    // Validate lang
    if (lang !== "hu" && lang !== "en" && lang !== "de") {
      throw new BadRequestException(`Invalid language code: "${lang}". Use hu, en, or de.`);
    }

    // Resolve tenant
    const tenant = await this.tenantResolver.resolve({ lang, tenantKey });

    // Get site settings
    const siteSettings = await this.appSettingsService.getSiteSettings();
    const siteName = siteSettings.siteName[tenant.lang as "hu" | "en" | "de"];
    const seoTitle = siteSettings.seoTitle[tenant.lang as "hu" | "en" | "de"] || siteName;
    const seoDescription = siteSettings.seoDescription[tenant.lang as "hu" | "en" | "de"] || "";

    return {
      title: `${seoTitle} - ${siteName}`,
      description: seoDescription,
      image: "",
      url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}`,
      type: "website",
      siteName,
    };
  }
}


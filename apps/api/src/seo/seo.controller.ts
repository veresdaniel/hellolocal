// src/seo/seo.controller.ts
import { Controller, Get, Param, Query, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantKeyResolverService } from "../tenant/tenant-key-resolver.service";
import { SlugResolverService } from "../slug/slug-resolver.service";
import { SlugEntityType } from "@prisma/client";
import { AdminAppSettingsService } from "../admin/admin-app-settings.service";

/**
 * Removes HTML tags from a string and normalizes whitespace
 * Used for meta descriptions which should be plain text
 */
function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, " ");
  // Normalize whitespace (multiple spaces/newlines to single space)
  return text.replace(/\s+/g, " ").trim();
}

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

    // Get site settings for the resolved tenant
    const siteSettings = await this.appSettingsService.getSiteSettings(tenant.tenantId);

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
          openingHours: {
            orderBy: { dayOfWeek: 'asc' },
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
      const rawDescription = translation?.seoDescription || translation?.description || "";
      const description = stripHtml(rawDescription);
      // Use SEO image, then hero image, then default placeholder detail hero image
      const image = translation?.seoImage || place.heroImage || siteSettings.defaultPlaceholderDetailHeroImage || "";
      const keywords = translation?.seoKeywords || [];
      const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}/place/${slugResult.canonicalSlug}`;

      // Generate basic LocalBusiness schema.org data
      const schemaOrg: any = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: translation?.name || place.id,
        url,
      };

      if (description) {
        schemaOrg.description = description;
      }

      if (image) {
        schemaOrg.image = image;
      }

      if (translation?.address) {
        schemaOrg.address = {
          "@type": "PostalAddress",
          streetAddress: stripHtml(translation.address),
        };
      }

      if (translation?.phone) {
        schemaOrg.telephone = translation.phone;
      }

      if (translation?.email) {
        schemaOrg.email = translation.email;
      }

      if (place.lat && place.lng) {
        schemaOrg.geo = {
          "@type": "GeoCoordinates",
          latitude: place.lat,
          longitude: place.lng,
        };
      }

      // Add opening hours if available
      if (place.openingHours && place.openingHours.length > 0) {
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const openingHoursSpec = place.openingHours
          .filter((oh) => !oh.isClosed && oh.openTime && oh.closeTime)
          .map((oh) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: dayNames[oh.dayOfWeek] || `https://schema.org/${dayNames[oh.dayOfWeek] || "DayOfWeek"}`,
            opens: oh.openTime || undefined,
            closes: oh.closeTime || undefined,
          }));

        if (openingHoursSpec.length > 0) {
          schemaOrg.openingHoursSpecification = openingHoursSpec;
        }
      }

      // Add social media links
      const sameAs: string[] = [];
      if (translation?.website) sameAs.push(translation.website);
      if (translation?.facebook) sameAs.push(translation.facebook);
      if (sameAs.length > 0) {
        schemaOrg.sameAs = sameAs;
      }

      return {
        title: `${title} - ${siteName}`,
        description,
        image,
        keywords,
        url,
        type: "website",
        siteName,
        schemaOrg,
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
          place: {
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
      const rawDescription = translation?.seoDescription || translation?.shortDescription || translation?.description || "";
      const description = stripHtml(rawDescription);
      // Use SEO image, then hero image, then default placeholder detail hero image
      const image = translation?.seoImage || event.heroImage || siteSettings.defaultPlaceholderDetailHeroImage || "";
      const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}/event/${slugResult.canonicalSlug}`;

      // Generate basic Event schema.org data
      const schemaOrg: any = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: translation?.title || event.id,
        url,
      };

      if (description) {
        schemaOrg.description = description;
      }

      if (image) {
        schemaOrg.image = image;
      }

      if (event.startDate) {
        schemaOrg.startDate = new Date(event.startDate).toISOString();
      }

      if (event.endDate) {
        schemaOrg.endDate = new Date(event.endDate).toISOString();
      }

      // Build location object
      if (event.lat && event.lng) {
        const location: any = {
          "@type": "Place",
          geo: {
            "@type": "GeoCoordinates",
            latitude: event.lat,
            longitude: event.lng,
          },
        };

        // Add place name if event is associated with a place
        if (event.place) {
          const placeTranslation = event.place.translations.find((t) => t.lang === tenant.lang) ||
            event.place.translations.find((t) => t.lang === "hu");
          if (placeTranslation?.name) {
            location.name = placeTranslation.name;
          }
          if (placeTranslation?.address) {
            location.address = {
              "@type": "PostalAddress",
              streetAddress: stripHtml(placeTranslation.address),
            };
          }
        }

        schemaOrg.location = location;
      } else if (event.place) {
        // Event has a place but no coordinates - use place info
        const placeTranslation = event.place.translations.find((t) => t.lang === tenant.lang) ||
          event.place.translations.find((t) => t.lang === "hu");
        if (placeTranslation) {
          const location: any = {
            "@type": "Place",
          };
          if (placeTranslation.name) location.name = placeTranslation.name;
          if (placeTranslation.address) {
            location.address = {
              "@type": "PostalAddress",
              streetAddress: stripHtml(placeTranslation.address),
            };
          }
          if (event.place.lat && event.place.lng) {
            location.geo = {
              "@type": "GeoCoordinates",
              latitude: event.place.lat,
              longitude: event.place.lng,
            };
          }
          schemaOrg.location = location;
        }
      }

      schemaOrg.organizer = {
        "@type": "Organization",
        name: siteName,
        url: process.env.FRONTEND_URL || "http://localhost:5173",
      };

      return {
        title: `${title} - ${siteName}`,
        description,
        image,
        url,
        type: "website",
        siteName,
        schemaOrg,
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

    // Get site settings for the resolved tenant
    const siteSettings = await this.appSettingsService.getSiteSettings(tenant.tenantId);
    const siteName = siteSettings.siteName[tenant.lang as "hu" | "en" | "de"];
    const seoTitle = siteSettings.seoTitle[tenant.lang as "hu" | "en" | "de"] || siteName;
    const rawSeoDescription = siteSettings.seoDescription[tenant.lang as "hu" | "en" | "de"] || "";
    const seoDescription = stripHtml(rawSeoDescription);
    const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/${tenant.lang}${tenant.canonicalTenantKey ? `/${tenant.canonicalTenantKey}` : ""}`;

    // Generate WebSite schema.org data
    const schemaOrg: any = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url,
    };

    if (seoDescription) {
      schemaOrg.description = seoDescription;
    }

    // Add SearchAction for site search
    schemaOrg.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    };

    return {
      title: `${seoTitle} - ${siteName}`,
      description: seoDescription,
      image: "",
      url,
      type: "website",
      siteName,
      schemaOrg,
    };
  }
}


import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformSettingsDto } from "./platform-settings.dto";
import { Lang } from "@prisma/client";
import { sanitizeImageUrl } from "../common/url-validation";

type LangType = "hu" | "en" | "de";

function pickLang(lang: string): LangType {
  if (lang === "hu" || lang === "en" || lang === "de") return lang;
  return "hu";
}

function deepMerge<T>(base: T, override: any): T {
  if (!override) return base;
  // kis, safe merge: objectok merge, egyéb felülír
  const isObj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(override)) {
    const bv = (out as any)[k];
    const ov = override[k];
    out[k] = isObj(bv) && isObj(ov) ? deepMerge(bv, ov) : ov;
  }
  return out;
}

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformSettings(args: { lang: string; siteKey?: string }): Promise<PlatformSettingsDto> {
    const lang = pickLang(args.lang);
    const siteKey = args.siteKey;

    let siteId: string;
    let resolvedSiteKey: string;

    // 1) Site feloldás siteKey alapján (nyelvesített) vagy default site
    if (!siteKey) {
      // Single-site mode: use default site
      const defaultSlug = process.env.DEFAULT_SITE_SLUG ?? "etyek-budai";
      const defaultSite = await this.prisma.site.findUnique({
        where: { slug: defaultSlug },
        select: { id: true, slug: true },
      });
      if (!defaultSite) throw new NotFoundException("Default site not found");
      siteId = defaultSite.id;
      resolvedSiteKey = defaultSlug;
    } else {
      // Multi-site mode: lookup SiteKey
      // Note: Since unique constraint is now [siteId, lang, slug], we use findFirst
      // and prioritize isPrimary=true entries
      const sk = await this.prisma.siteKey.findFirst({
        where: {
          lang,
          slug: siteKey,
          isActive: true,
        },
        orderBy: [
          { isPrimary: 'desc' }, // Primary keys first
          { createdAt: 'asc' }, // Then by creation date (oldest first)
        ],
        select: { siteId: true, slug: true, isActive: true },
      });
      if (!sk || !sk.isActive) {
        // Fallback: try to find site by internal slug
        const site = await this.prisma.site.findUnique({
          where: { slug: siteKey },
          select: { id: true, slug: true },
        });
        if (!site) throw new NotFoundException("Site not found");
        siteId = site.id;
        resolvedSiteKey = site.slug;
      } else {
        siteId = sk.siteId;
        resolvedSiteKey = sk.slug;
      }
    }

    // 2) SiteInstance (siteId+lang) + Site(+translation) + Brand
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        brand: {
          select: {
            name: true,
            logoUrl: true,
            faviconUrl: true,
            theme: true,
            placeholders: true,
            mapDefaults: true,
          },
        },
        translations: {
          where: { lang },
          take: 1,
          select: {
            name: true,
            shortDescription: true,
            description: true,
            seoTitle: true,
            seoDescription: true,
          },
        },
        siteInstances: {
          where: { lang },
          take: 1,
          select: { isDefault: true, mapConfig: true, features: true },
        },
      },
    });
    if (!site) throw new NotFoundException("Site not found");

    const t = site.translations[0];

    // 3) Defaults (app-level hardcoded)
    const appDefaults = {
      seo: { indexable: true },
      placeholders: {
        placeCard: null,
        placeHero: null,
        eventCard: null,
        avatar: null,
      },
      map: {
        provider: "osm" as const,
        style: null,
        center: null as any,
        zoom: null as any,
        bounds: null as any,
        cluster: true as any,
        marker: null as any,
      },
      features: {
        events: true,
        blog: true,
        knowledgeBase: true,
        cookieConsent: true,
      },
    };

    // 4) Brand defaults → SiteInstance overrides
    const brandPlaceholders = (site.brand.placeholders ?? {}) as any;
    const brandMapDefaults = (site.brand.mapDefaults ?? {}) as any;

    const instance = site.siteInstances[0];
    const instanceFeatures = (instance?.features ?? {}) as any;
    const instanceMap = (instance?.mapConfig ?? {}) as any;

    const mergedMap = deepMerge(deepMerge(appDefaults.map, brandMapDefaults), instanceMap);
    const mergedFeatures = deepMerge(appDefaults.features, instanceFeatures) as any;
    
    // Placeholders come from Brand only (not from SiteInstance)
    // Map placeholders from brand format to DTO format
    const placeholdersDto = {
      placeCard: brandPlaceholders.defaultPlaceholderCardImage ?? appDefaults.placeholders.placeCard,
      placeHero: brandPlaceholders.defaultPlaceholderDetailHeroImage ?? appDefaults.placeholders.placeHero,
      eventCard: brandPlaceholders.defaultEventPlaceholderCardImage ?? appDefaults.placeholders.eventCard,
      avatar: brandPlaceholders.brandBadgeIcon ?? appDefaults.placeholders.avatar,
    };

    // 5) indexable: instance.features.seo?.indexable felülírhatja
    const indexable =
      instanceFeatures?.seo?.indexable ??
      appDefaults.seo.indexable;

    return {
      lang,
      siteKey: resolvedSiteKey,
      site: {
        id: site.id,
        name: t?.name ?? "(missing translation)",
        shortDescription: t?.shortDescription ?? null,
        description: t?.description ?? null,
      },
      brand: {
        name: site.brand.name,
        logoUrl: site.brand.logoUrl ?? null,
        faviconUrl: site.brand.faviconUrl ?? null,
        theme: site.brand.theme ?? null,
      },
      seo: {
        defaultTitle: t?.seoTitle ?? null,
        defaultDescription: t?.seoDescription ?? null,
        indexable: !!indexable,
      },
      placeholders: placeholdersDto,
      map: mergedMap,
      features: {
        events: mergedFeatures?.enableEvents ?? appDefaults.features.events,
        blog: mergedFeatures?.enableBlog ?? appDefaults.features.blog,
        knowledgeBase: mergedFeatures?.enableStaticPages ?? appDefaults.features.knowledgeBase,
        cookieConsent: mergedFeatures?.cookieConsent ?? appDefaults.features.cookieConsent,
      },
    };
  }

  /**
   * Get map settings for a site (admin)
   * Uses SiteInstance mapConfig (falls back to Brand mapDefaults if no SiteInstance config)
   */
  async getMapSettings(siteId: string) {
    // Get default SiteInstance (or first one if no default)
    const siteInstance = await this.prisma.siteInstance.findFirst({
      where: {
        siteId,
        OR: [{ isDefault: true }, {}],
      },
      orderBy: { isDefault: "desc" },
    });

    if (siteInstance?.mapConfig) {
      const config = siteInstance.mapConfig as any;
      return {
        townId: config.townId || null,
        lat: config.lat || null,
        lng: config.lng || null,
        zoom: config.zoom || null,
      };
    }

    // Fallback to Brand mapDefaults
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: { brand: true },
    });

    if (site?.brand?.mapDefaults) {
      const defaults = site.brand.mapDefaults as any;
      return {
        townId: defaults.townId || null,
        lat: defaults.lat || null,
        lng: defaults.lng || null,
        zoom: defaults.zoom || null,
      };
    }

    return {
      townId: null,
      lat: null,
      lng: null,
      zoom: null,
    };
  }

  /**
   * Set map settings for a site (admin)
   * Updates the default SiteInstance's mapConfig
   */
  async setMapSettings(siteId: string, settings: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  }) {
    // Get or create default SiteInstance
    let siteInstance = await this.prisma.siteInstance.findFirst({
      where: {
        siteId,
        isDefault: true,
      },
    });

    if (!siteInstance) {
      // Create default SiteInstance with first available language
      const site = await this.prisma.site.findUnique({
        where: { id: siteId },
        include: { translations: true },
      });

      if (!site) {
        throw new BadRequestException(`Site with ID ${siteId} not found`);
      }

      const firstLang = site.translations[0]?.lang || Lang.hu;

      siteInstance = await this.prisma.siteInstance.create({
        data: {
          siteId,
          lang: firstLang,
          isDefault: true,
          mapConfig: {},
        },
      });
    }

    // Update mapConfig
    const currentConfig = (siteInstance.mapConfig as any) || {};
    const newConfig: any = {
      ...currentConfig,
    };

    if (settings.townId !== undefined) {
      newConfig.townId = settings.townId;
    }
    if (settings.lat !== undefined) {
      newConfig.lat = settings.lat;
    }
    if (settings.lng !== undefined) {
      newConfig.lng = settings.lng;
    }
    if (settings.zoom !== undefined) {
      newConfig.zoom = settings.zoom;
    }

    await this.prisma.siteInstance.update({
      where: { id: siteInstance.id },
      data: { mapConfig: newConfig },
    });

    return this.getMapSettings(siteId);
  }

  /**
   * Get platform settings for a site (admin)
   * Returns all languages' settings in a format compatible with AdminAppSettingsService
   */
  async getPlatformSettingsForAdmin(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        brand: true,
        translations: true,
        siteInstances: {
          orderBy: { isDefault: "desc" },
        },
      },
    });

    if (!site) {
      throw new BadRequestException(`Site with ID ${siteId} not found`);
    }

    if (!site.brand) {
      throw new BadRequestException(`Site ${siteId} has no brand assigned`);
    }

    // Get brand assets
    const brand = site.brand;
    const placeholders = (brand.placeholders as any) || {};
    
    // Initialize with defaults
    const siteName: { hu: string; en: string; de: string } = { hu: "HelloLocal", en: "HelloLocal", de: "HelloLocal" };
    const siteDescription: { hu: string; en: string; de: string } = { hu: "", en: "", de: "" };
    const seoTitle: { hu: string; en: string; de: string } = { hu: "", en: "", de: "" };
    const seoDescription: { hu: string; en: string; de: string } = { hu: "", en: "", de: "" };
    let isCrawlable = true;

    // Get language-specific content from SiteTranslation
    for (const translation of site.translations) {
      const lang = translation.lang;
      siteName[lang] = translation.name || "HelloLocal";
      siteDescription[lang] = translation.description || "";
      seoTitle[lang] = translation.seoTitle || "";
      seoDescription[lang] = translation.seoDescription || "";
    }

    // Get runtime features from SiteInstances (isCrawlable, enableEvents, etc.)
    // Use the default instance or first one if no default
    const defaultInstance = site.siteInstances.find(si => si.isDefault) || site.siteInstances[0];
    if (defaultInstance?.features) {
      const features = defaultInstance.features as any;
      if (features.isCrawlable !== undefined) {
        isCrawlable = features.isCrawlable;
      }
    }

    return {
      siteName,
      siteDescription,
      seoTitle,
      seoDescription,
      isCrawlable,
      defaultPlaceholderCardImage: placeholders.defaultPlaceholderCardImage || null,
      defaultPlaceholderDetailHeroImage: placeholders.defaultPlaceholderDetailHeroImage || null,
      defaultEventPlaceholderCardImage: placeholders.defaultEventPlaceholderCardImage || null,
      brandBadgeIcon: placeholders.brandBadgeIcon || null,
      faviconUrl: brand.faviconUrl || null,
    };
  }

  /**
   * Set platform settings for a site (admin)
   * Updates Brand for brand assets, SiteTranslation for language-specific content, and SiteInstance for runtime features
   */
  async setPlatformSettings(siteId: string, settings: {
    siteName?: { hu?: string; en?: string; de?: string };
    siteDescription?: { hu?: string; en?: string; de?: string };
    seoTitle?: { hu?: string; en?: string; de?: string };
    seoDescription?: { hu?: string; en?: string; de?: string };
    isCrawlable?: boolean;
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
    faviconUrl?: string | null;
  }) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        brand: true,
        translations: true,
        siteInstances: true,
      },
    });

    if (!site) {
      throw new BadRequestException(`Site with ID ${siteId} not found`);
    }

    if (!site.brand) {
      throw new BadRequestException(`Site ${siteId} has no brand assigned`);
    }

    // Update Brand (brand assets)
    const brandUpdates: any = {};
    const placeholders: any = (site.brand.placeholders as any) || {};

    if (settings.faviconUrl !== undefined) {
      const sanitizedUrl = settings.faviconUrl && settings.faviconUrl.trim() !== ""
        ? sanitizeImageUrl(settings.faviconUrl)
        : null;
      if (settings.faviconUrl && settings.faviconUrl.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid favicon URL. Only http:// and https:// URLs are allowed.");
      }
      brandUpdates.faviconUrl = sanitizedUrl;
    }

    if (settings.defaultPlaceholderCardImage !== undefined) {
      const sanitizedUrl = settings.defaultPlaceholderCardImage && settings.defaultPlaceholderCardImage.trim() !== ""
        ? sanitizeImageUrl(settings.defaultPlaceholderCardImage)
        : null;
      if (settings.defaultPlaceholderCardImage && settings.defaultPlaceholderCardImage.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid defaultPlaceholderCardImage URL. Only http:// and https:// URLs are allowed.");
      }
      placeholders.defaultPlaceholderCardImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.defaultPlaceholderDetailHeroImage !== undefined) {
      const sanitizedUrl = settings.defaultPlaceholderDetailHeroImage && settings.defaultPlaceholderDetailHeroImage.trim() !== ""
        ? sanitizeImageUrl(settings.defaultPlaceholderDetailHeroImage)
        : null;
      if (settings.defaultPlaceholderDetailHeroImage && settings.defaultPlaceholderDetailHeroImage.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid defaultPlaceholderDetailHeroImage URL. Only http:// and https:// URLs are allowed.");
      }
      placeholders.defaultPlaceholderDetailHeroImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.defaultEventPlaceholderCardImage !== undefined) {
      const sanitizedUrl = settings.defaultEventPlaceholderCardImage && settings.defaultEventPlaceholderCardImage.trim() !== ""
        ? sanitizeImageUrl(settings.defaultEventPlaceholderCardImage)
        : null;
      if (settings.defaultEventPlaceholderCardImage && settings.defaultEventPlaceholderCardImage.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid defaultEventPlaceholderCardImage URL. Only http:// and https:// URLs are allowed.");
      }
      placeholders.defaultEventPlaceholderCardImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.brandBadgeIcon !== undefined) {
      const sanitizedUrl = settings.brandBadgeIcon && settings.brandBadgeIcon.trim() !== ""
        ? sanitizeImageUrl(settings.brandBadgeIcon)
        : null;
      if (settings.brandBadgeIcon && settings.brandBadgeIcon.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException("Invalid brandBadgeIcon URL. Only http:// and https:// URLs are allowed.");
      }
      placeholders.brandBadgeIcon = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (Object.keys(brandUpdates).length > 0) {
      await this.prisma.brand.update({
        where: { id: site.brand.id },
        data: brandUpdates,
      });
    }

    // Update SiteTranslation (language-specific content: name, description, SEO)
    const languages = [Lang.hu, Lang.en, Lang.de];
    for (const lang of languages) {
      let translation = site.translations.find((t) => t.lang === lang);

      if (!translation) {
        // Create SiteTranslation if it doesn't exist
        translation = await this.prisma.siteTranslation.create({
          data: {
            siteId,
            lang,
            name: settings.siteName?.[lang] || "HelloLocal",
            description: settings.siteDescription?.[lang] || null,
            seoTitle: settings.seoTitle?.[lang] || null,
            seoDescription: settings.seoDescription?.[lang] || null,
          },
        });
      } else {
        // Update existing SiteTranslation
        const updates: any = {};
        if (settings.siteName !== undefined && settings.siteName[lang] !== undefined) {
          updates.name = settings.siteName[lang] || "HelloLocal";
        }
        if (settings.siteDescription !== undefined && settings.siteDescription[lang] !== undefined) {
          updates.description = settings.siteDescription[lang] || null;
        }
        if (settings.seoTitle !== undefined && settings.seoTitle[lang] !== undefined) {
          updates.seoTitle = settings.seoTitle[lang] || null;
        }
        if (settings.seoDescription !== undefined && settings.seoDescription[lang] !== undefined) {
          updates.seoDescription = settings.seoDescription[lang] || null;
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.siteTranslation.update({
            where: { id: translation.id },
            data: updates,
          });
        }
      }
    }

    // Update SiteInstance (runtime features: isCrawlable, enableEvents, etc.)
    // Use the default instance or first one if no default
    let defaultInstance = site.siteInstances.find(si => si.isDefault) || site.siteInstances[0];
    
    if (!defaultInstance) {
      // Create default SiteInstance if it doesn't exist
      defaultInstance = await this.prisma.siteInstance.create({
        data: {
          siteId,
          lang: Lang.hu, // Default to first language
          isDefault: true,
          features: {},
        },
      });
    }

    if (settings.isCrawlable !== undefined) {
      const features: any = (defaultInstance.features as any) || {};
      features.isCrawlable = settings.isCrawlable;
      
      await this.prisma.siteInstance.update({
        where: { id: defaultInstance.id },
        data: { features },
      });
    }

    // Return fresh data from database
    return this.getPlatformSettingsForAdmin(siteId);
  }
}

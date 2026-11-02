import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { canEditCopy } from "../auth/copy-access";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformSettingsDto } from "./platform-settings.dto";
import { Lang } from "../common/language-code";
import { langOrDefault } from "../common/lang";
import { sanitizeImageUrl } from "../common/url-validation";
import { isMissingColumn } from "../common/prisma-column";
import { normalizeGaMeasurementId } from "../common/ga-measurement-id";
import { UiCopyService } from "../ui-copy/ui-copy.service";
import { alignPlanMatrixAndPublicPlans } from "./plan-matrix-sync";
import { ERROR_MESSAGES } from "../common/constants/error-messages";

function pickLang(lang: string): Lang {
  return langOrDefault(lang);
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly uiCopy: UiCopyService
  ) {}

  async getPlatformSettings(args: {
    lang: string;
    siteKey?: string;
  }): Promise<PlatformSettingsDto> {
    const lang = pickLang(args.lang);
    const siteKey = args.siteKey;

    let siteId: string;
    let resolvedSiteKey: string;

    // 1) Site feloldás siteKey alapján (nyelvesített) vagy default site
    if (!siteKey) {
      // Single-site mode: use default site
      const defaultSlug = process.env.DEFAULT_SITE_SLUG ?? "etyek-budai";
      let defaultSite = await this.prisma.site.findUnique({
        where: { slug: defaultSlug },
        select: { id: true, slug: true, isActive: true },
      });

      // If default site doesn't exist or is inactive, use first active site
      if (!defaultSite || !defaultSite.isActive) {
        defaultSite = await this.prisma.site.findFirst({
          where: { isActive: true },
          select: { id: true, slug: true, isActive: true },
          orderBy: { createdAt: "asc" }, // Use oldest active site as fallback
        });

        if (!defaultSite) {
          throw new NotFoundException(
            "No active site found. Please create at least one active site."
          );
        }
      }

      siteId = defaultSite.id;
      resolvedSiteKey = defaultSite.slug;
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
          { isPrimary: "desc" }, // Primary keys first
          { createdAt: "asc" }, // Then by creation date (oldest first)
        ],
        select: { siteId: true, slug: true, isActive: true },
      });
      if (!sk || !sk.isActive) {
        // Fallback: try to find site by internal slug
        const site = await this.prisma.site.findUnique({
          where: { slug: siteKey },
          select: { id: true, slug: true },
        });
        if (!site) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);
        siteId = site.id;
        resolvedSiteKey = site.slug;
      } else {
        siteId = sk.siteId;
        resolvedSiteKey = sk.slug;
      }
    }

    // 2) SiteInstance (siteId+lang) + Site(+translation) + Brand
    // landingHtml may be absent until the migration runs on live; keep serving the map.
    const siteSelectBase = {
      id: true,
      languages: true,
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
        select: {
          lang: true,
          name: true,
          shortDescription: true,
          description: true,
          heroImage: true,
          seoTitle: true,
          seoDescription: true,
        },
      },
      siteInstances: {
        select: { lang: true, isDefault: true, mapConfig: true, features: true },
      },
      subscription: {
        select: { ladderSuspended: true },
      },
    } as const;

    const siteSelectWithLanding = {
      ...siteSelectBase,
      translations: {
        select: {
          ...siteSelectBase.translations.select,
          landingHtml: true,
          listIntroHtml: true,
          listIntroImage: true,
        },
      },
    } as const;

    const siteSelectWithLandingOnly = {
      ...siteSelectBase,
      translations: {
        select: {
          ...siteSelectBase.translations.select,
          landingHtml: true,
        },
      },
    } as const;

    // Cast select: live DB / generated client may lag migrations (landingHtml, listIntro, ladder).
    let site: any;
    try {
      site = await this.prisma.site.findUnique({
        where: { id: siteId },
        select: siteSelectWithLanding as any,
      });
    } catch (error) {
      const listIntroMissing =
        isMissingColumn(error, "listIntroHtml") || isMissingColumn(error, "listIntroImage");
      if (
        !isMissingColumn(error, "landingHtml") &&
        !listIntroMissing &&
        !isMissingColumn(error)
      ) {
        throw error;
      }
      try {
        site = await this.prisma.site.findUnique({
          where: { id: siteId },
          select: (listIntroMissing ? siteSelectWithLandingOnly : siteSelectBase) as any,
        });
      } catch (retryError) {
        // visitor-ladder subscription columns may also be unmigrated on live
        if (!isMissingColumn(retryError)) throw retryError;
        const { subscription: _subscription, ...withoutSub } = siteSelectBase;
        site = await this.prisma.site.findUnique({
          where: { id: siteId },
          select: withoutSub as any,
        });
      }
    }
    if (!site) throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_SITE);
    if (!site.brand) throw new NotFoundException("Site has no brand assigned");

    let siteGaMeasurementId: string | null = null;
    try {
      const gaRow = await this.prisma.site.findUnique({
        where: { id: siteId },
        select: { gaMeasurementId: true } as any,
      });
      const raw = (gaRow as { gaMeasurementId?: string | null } | null)?.gaMeasurementId;
      if (raw) {
        try {
          siteGaMeasurementId = normalizeGaMeasurementId(raw);
        } catch {
          siteGaMeasurementId = null;
        }
      }
    } catch (error) {
      if (!isMissingColumn(error, "gaMeasurementId")) throw error;
    }

    let siteTheme: unknown = null;
    try {
      const themeRow = await this.prisma.site.findUnique({
        where: { id: siteId },
        select: { theme: true } as any,
      });
      siteTheme = (themeRow as { theme?: unknown } | null)?.theme ?? null;
    } catch (error) {
      if (!isMissingColumn(error, "theme")) throw error;
    }

    const published = site.languages?.length ? site.languages : ["hu", "en", "de"];
    const translations = (site.translations || []) as Array<{
      lang: string;
      name?: string | null;
      shortDescription?: string | null;
      description?: string | null;
      heroImage?: string | null;
      landingHtml?: string | null;
      listIntroHtml?: string | null;
      listIntroImage?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }>;
    const t =
      translations.find((item) => item.lang === lang) ||
      translations.find((item) => item.lang === published[0]) ||
      translations.find((item) => item.lang === Lang.hu) ||
      translations[0];
    const instances = (site.siteInstances || []) as Array<{
      lang: string;
      isDefault?: boolean;
      mapConfig?: unknown;
      features?: unknown;
    }>;
    const instance =
      instances.find((item) => item.lang === lang) ||
      instances.find((item) => item.isDefault) ||
      instances[0] ||
      null;

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
    const brandPlaceholders = (site.brand?.placeholders ?? {}) as any;
    const brandMapDefaults = (site.brand?.mapDefaults ?? {}) as any;

    // Get SiteInstance (default or first one, or null if none exist)
    const instanceFeatures = (instance?.features ?? {}) as any;
    const instanceMap = (instance?.mapConfig ?? {}) as any;

    const mergedMap = deepMerge(deepMerge(appDefaults.map, brandMapDefaults), instanceMap);
    const mergedFeatures = deepMerge(appDefaults.features, instanceFeatures) as any;

    // Placeholders come from Brand only (not from SiteInstance)
    // Map placeholders from brand format to DTO format
    const placeholdersDto = {
      placeCard:
        brandPlaceholders.defaultPlaceholderCardImage ?? appDefaults.placeholders.placeCard,
      placeHero:
        brandPlaceholders.defaultPlaceholderDetailHeroImage ?? appDefaults.placeholders.placeHero,
      eventCard:
        brandPlaceholders.defaultEventPlaceholderCardImage ?? appDefaults.placeholders.eventCard,
      avatar: brandPlaceholders.brandBadgeIcon ?? appDefaults.placeholders.avatar,
    };

    // 5) indexable: instance.features.seo?.indexable felülírhatja, fallback: globális crawlability
    const globalCrawlability = await this.getGlobalCrawlability();
    const indexable = instanceFeatures?.seo?.indexable ?? globalCrawlability;

    // Get feature matrix overrides from Brand (for pricing page)
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
      select: { planOverrides: true, placePlanOverrides: true },
    });

    return {
      lang,
      languages: published,
      siteKey: resolvedSiteKey,
      site: {
        id: site.id,
        name: t?.name ?? "(missing translation)",
        shortDescription: t?.shortDescription ?? null,
        description: t?.description ?? null,
        heroImage: t?.heroImage ?? null,
        landingHtml: t?.landingHtml ?? null,
        listIntroHtml: t?.listIntroHtml ?? null,
        listIntroImage: t?.listIntroImage ?? null,
      },
      brand: {
        name: site.brand?.name ?? "HelloLocal",
        logoUrl: site.brand?.logoUrl ?? null,
        faviconUrl: site.brand?.faviconUrl ?? null,
        theme: site.brand?.theme ?? null,
      },
      siteTheme,
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
      featureMatrix: {
        planOverrides: (brand?.planOverrides as any) || null,
        placePlanOverrides: (brand?.placePlanOverrides as any) || null,
      },
      visitorHold: site.subscription?.ladderSuspended === true,
      platform: await this.getPlatformLocaleSettings(),
      analytics: {
        gaMeasurementId: siteGaMeasurementId,
      },
    };
  }

  /**
   * Get global crawlability setting from AppSetting
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
   * Get platform settings (locale, currency, timeFormat, weekStartsOn) from AppSetting
   */
  async getPlatformLocaleSettings(): Promise<{
    locale: string;
    currency: string;
    timeFormat: "24h" | "12h";
    weekStartsOn: number;
  }> {
    // Get platform settings from AppSetting
    const [localeSetting, currencySetting, timeFormatSetting, weekStartsOnSetting] =
      await Promise.all([
        this.prisma.appSetting.findUnique({ where: { key: "platform.locale" } }),
        this.prisma.appSetting.findUnique({ where: { key: "platform.currency" } }),
        this.prisma.appSetting.findUnique({ where: { key: "platform.timeFormat" } }),
        this.prisma.appSetting.findUnique({ where: { key: "platform.weekStartsOn" } }),
      ]);

    return {
      locale: localeSetting?.value || "hu-HU",
      currency: currencySetting?.value || "HUF",
      timeFormat: (timeFormatSetting?.value === "12h" ? "12h" : "24h") as "24h" | "12h",
      weekStartsOn: weekStartsOnSetting?.value ? parseInt(weekStartsOnSetting.value, 10) : 1,
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
  async setMapSettings(
    siteId: string,
    settings: {
      townId?: string | null;
      lat?: number | null;
      lng?: number | null;
      zoom?: number | null;
    }
  ) {
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
    const siteName: Record<string, string> = { hu: "HelloLocal", en: "HelloLocal", de: "HelloLocal" };
    const siteDescription: Record<string, string> = { hu: "", en: "", de: "" };
    const seoTitle: Record<string, string> = { hu: "", en: "", de: "" };
    const seoDescription: Record<string, string> = { hu: "", en: "", de: "" };
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
    // Use the default instance or first one if no default, or null if none exist
    const defaultInstance =
      site.siteInstances?.find((si) => si.isDefault) || site.siteInstances?.[0] || null;
    let hasSiteSpecificCrawlability = false;
    if (defaultInstance?.features) {
      const features = defaultInstance.features as any;
      if (features.isCrawlable !== undefined) {
        isCrawlable = features.isCrawlable;
        hasSiteSpecificCrawlability = true;
      }
    }

    // Fallback to global crawlability if no site-specific setting
    if (!hasSiteSpecificCrawlability) {
      const globalCrawlability = await this.getGlobalCrawlability();
      isCrawlable = globalCrawlability;
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
  async setPlatformSettings(
    siteId: string,
    settings: {
      siteName?: Record<string, string | undefined>;
      siteDescription?: Record<string, string | undefined>;
      seoTitle?: Record<string, string | undefined>;
      seoDescription?: Record<string, string | undefined>;
      isCrawlable?: boolean;
      defaultPlaceholderCardImage?: string | null;
      defaultPlaceholderDetailHeroImage?: string | null;
      defaultEventPlaceholderCardImage?: string | null;
      brandBadgeIcon?: string | null;
      faviconUrl?: string | null;
    }
  ) {
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
      const sanitizedUrl =
        settings.faviconUrl && settings.faviconUrl.trim() !== ""
          ? sanitizeImageUrl(settings.faviconUrl)
          : null;
      if (settings.faviconUrl && settings.faviconUrl.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException(
          "Invalid favicon URL. Only http:// and https:// URLs are allowed."
        );
      }
      brandUpdates.faviconUrl = sanitizedUrl;
    }

    if (settings.defaultPlaceholderCardImage !== undefined) {
      const sanitizedUrl =
        settings.defaultPlaceholderCardImage && settings.defaultPlaceholderCardImage.trim() !== ""
          ? sanitizeImageUrl(settings.defaultPlaceholderCardImage)
          : null;
      if (
        settings.defaultPlaceholderCardImage &&
        settings.defaultPlaceholderCardImage.trim() !== "" &&
        !sanitizedUrl
      ) {
        throw new BadRequestException(
          "Invalid defaultPlaceholderCardImage URL. Only http:// and https:// URLs are allowed."
        );
      }
      placeholders.defaultPlaceholderCardImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.defaultPlaceholderDetailHeroImage !== undefined) {
      const sanitizedUrl =
        settings.defaultPlaceholderDetailHeroImage &&
        settings.defaultPlaceholderDetailHeroImage.trim() !== ""
          ? sanitizeImageUrl(settings.defaultPlaceholderDetailHeroImage)
          : null;
      if (
        settings.defaultPlaceholderDetailHeroImage &&
        settings.defaultPlaceholderDetailHeroImage.trim() !== "" &&
        !sanitizedUrl
      ) {
        throw new BadRequestException(
          "Invalid defaultPlaceholderDetailHeroImage URL. Only http:// and https:// URLs are allowed."
        );
      }
      placeholders.defaultPlaceholderDetailHeroImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.defaultEventPlaceholderCardImage !== undefined) {
      const sanitizedUrl =
        settings.defaultEventPlaceholderCardImage &&
        settings.defaultEventPlaceholderCardImage.trim() !== ""
          ? sanitizeImageUrl(settings.defaultEventPlaceholderCardImage)
          : null;
      if (
        settings.defaultEventPlaceholderCardImage &&
        settings.defaultEventPlaceholderCardImage.trim() !== "" &&
        !sanitizedUrl
      ) {
        throw new BadRequestException(
          "Invalid defaultEventPlaceholderCardImage URL. Only http:// and https:// URLs are allowed."
        );
      }
      placeholders.defaultEventPlaceholderCardImage = sanitizedUrl;
      brandUpdates.placeholders = placeholders;
    }

    if (settings.brandBadgeIcon !== undefined) {
      const sanitizedUrl =
        settings.brandBadgeIcon && settings.brandBadgeIcon.trim() !== ""
          ? sanitizeImageUrl(settings.brandBadgeIcon)
          : null;
      if (settings.brandBadgeIcon && settings.brandBadgeIcon.trim() !== "" && !sanitizedUrl) {
        throw new BadRequestException(
          "Invalid brandBadgeIcon URL. Only http:// and https:// URLs are allowed."
        );
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
    const languages = site.languages?.length ? site.languages : [Lang.hu, Lang.en, Lang.de];
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
        if (
          settings.siteDescription !== undefined &&
          settings.siteDescription[lang] !== undefined
        ) {
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
    // Use the default instance or first one if no default, or null if none exist
    let defaultInstance =
      site.siteInstances?.find((si) => si.isDefault) || site.siteInstances?.[0] || null;

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

  /**
   * Get feature matrix (plan overrides) - superadmin only
   * Returns the planOverrides from the first Brand (global setting)
   */
  async getFeatureMatrix() {
    // Get the first brand (assuming single brand for global settings)
    // In multi-brand scenarios, you might want to use a specific brand or create a global config table
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, planOverrides: true, placePlanOverrides: true },
    });

    if (!brand) {
      // Return empty overrides if no brand exists
      return { planOverrides: null, placePlanOverrides: null };
    }

    return {
      planOverrides: (brand.planOverrides as any) || null,
      placePlanOverrides: (brand.placePlanOverrides as any) || null,
    };
  }

  /**
   * Set feature matrix (plan overrides) - superadmin only
   * Updates planOverrides in the first Brand (global setting).
   * Finite FREE/BASIC/PRO limits are copied into publicPlans so plan-card
   * bullets stay in sync; UiMessage names/pitch are left alone.
   */
  async setFeatureMatrix(planOverrides: any, placePlanOverrides?: any, role?: string | null) {
    if (!canEditCopy({ role }, "platform")) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_PLATFORM_SETTINGS_SUPERADMIN_ONLY);
    }
    // Get the first brand (assuming single brand for global settings)
    const brand = await this.prisma.brand.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!brand) {
      throw new BadRequestException("No brand found. Please create a brand first.");
    }

    const updateData: any = {};
    if (planOverrides !== undefined) {
      updateData.planOverrides =
        planOverrides === null ? null : alignPlanMatrixAndPublicPlans(planOverrides);
    }
    if (placePlanOverrides !== undefined) {
      updateData.placePlanOverrides = placePlanOverrides;
    }

    await this.prisma.brand.update({
      where: { id: brand.id },
      data: updateData,
    });

    // Plan-card {{count}} lines read live numbers; bust ui-copy so SSR/public
    // copy reloads promptly after a matrix or publicPlans write.
    this.uiCopy.invalidatePublicCache();

    return this.getFeatureMatrix();
  }
}

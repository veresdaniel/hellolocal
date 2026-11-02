import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SitePlan } from "@prisma/client";
import { Lang } from "../common/language-code";
import { normalizeLanguageCode, normalizeLanguageList } from "../common/language-code";
import { PLAN_DEFS } from "../entitlements/entitlements.config";
import { sitePlanAllowsCustomDomain } from "../entitlements/assert-custom-domain-allowed";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { generateSlug } from "../slug/slug.helper";
import { normalizeDomainHost } from "../common/domain-host";
import { assertHostnameAvailable } from "../common/assert-hostname-available";
import { isMissingColumn } from "../common/prisma-column";
import { normalizeGaMeasurementId } from "../common/ga-measurement-id";
import { sanitizeSiteTheme } from "../common/public-theme-colors";
import { SitemapService } from "../seo/sitemap.service";

export interface CreateSiteDto {
  slug: string;
  brandId: string; // Required: site must belong to a brand
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
  languages?: string[];
  domains?: SiteDomainInput[];
  plan?: SitePlan;
}

export interface SiteDomainInput {
  domain: string;
  defaultLang?: string | null;
  isPrimary?: boolean;
}

export interface UpdateSiteDto {
  slug?: string;
  brandId?: string;
  translations?: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
  // Billing/subscription fields
  plan?: SitePlan;
  planStatus?: string; // trial/active/past_due/canceled
  planValidUntil?: Date | string | null;
  planLimits?: Record<string, any> | null;
  billingEmail?: string | null;
  // Access control: public registration
  // If false, only site owner (siteadmin/superadmin) can create users and places
  // Only available for pro/business plans (basic always allows public registration)
  allowPublicRegistration?: boolean;
  languages?: string[];
  domains?: SiteDomainInput[];
  /** GA4 measurement ID (G-…). Empty string or null disables site analytics. */
  gaMeasurementId?: string | null;
  /** Public theme colors JSON. Null clears site override (falls back to Brand). */
  theme?: Record<string, unknown> | null;
}

@Injectable()
export class AdminSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly sitemapService: SitemapService
  ) {}

  /**
   * Several hosts can belong to one region: one primary (apex) plus subdomains.
   * Each may set its own default language; empty language uses the site default.
   * The primary host is mirrored to Site.primaryDomain; all hosts live in SiteDomain.
   * Without any domain the public address remains /:lang/:slug.
   */
  private async syncDomains(siteId: string, rawEntries: SiteDomainInput[], siteLanguages: string[]) {
    const siteDefault = siteLanguages[0] || "hu";
    const allowed = new Set(siteLanguages.length ? siteLanguages : [siteDefault]);
    const normalized: { domain: string; defaultLang: string; isPrimary: boolean }[] = [];
    const seen = new Set<string>();

    for (const entry of rawEntries) {
      const raw = entry?.domain?.trim() ?? "";
      if (!raw) continue;
      const domain = normalizeDomainHost(raw);
      if (!domain) {
        throw new BadRequestException(`Érvénytelen domain: „${raw}”. Példa: pelda.hu`);
      }
      if (seen.has(domain)) {
        throw new BadRequestException(`A(z) ${domain} domain kétszer szerepel.`);
      }
      seen.add(domain);

      const requested = entry.defaultLang?.trim() || "";
      let defaultLang = siteDefault;
      if (requested) {
        const code = normalizeLanguageCode(requested);
        if (!code || !allowed.has(code)) {
          throw new BadRequestException(`A(z) ${domain} nyelve nem tartozik a régió nyelvei közé.`);
        }
        defaultLang = code;
      }
      normalized.push({ domain, defaultLang, isPrimary: !!entry.isPrimary });
    }

    if (normalized.length) {
      const primaryIndex = normalized.findIndex((row) => row.isPrimary);
      const chosen = primaryIndex === -1 ? 0 : primaryIndex;
      normalized.forEach((row, index) => {
        row.isPrimary = index === chosen;
      });
      await this.assertCanSaveDomains(siteId, normalized.length);
      for (const row of normalized) {
        await assertHostnameAvailable(this.prisma, row.domain, { kind: "site", siteId });
      }
    }

    const primary = normalized.find((row) => row.isPrimary)?.domain ?? null;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.siteDomain.findMany({
        where: { siteId },
        select: { id: true, domain: true },
      });
      const keep = new Set(normalized.map((row) => row.domain));
      const removeIds = existing.filter((row) => !keep.has(row.domain)).map((row) => row.id);
      if (removeIds.length) {
        await tx.siteDomain.deleteMany({ where: { id: { in: removeIds } } });
      }
      for (const row of normalized) {
        await tx.siteDomain.upsert({
          where: { domain: row.domain },
          create: {
            siteId,
            domain: row.domain,
            isPrimary: row.isPrimary,
            isActive: true,
            defaultLang: row.defaultLang,
          },
          update: {
            siteId,
            isPrimary: row.isPrimary,
            isActive: true,
            defaultLang: row.defaultLang,
          },
        });
      }
      await tx.site.update({ where: { id: siteId }, data: { primaryDomain: primary } });
    });
    // Domain rows drive Host → sitemap/robots at request time; bust cache immediately.
    this.sitemapService.invalidate();
  }

  /** The list form sends one primary host. Aliases already stored on the region stay. */
  private async syncPrimaryKeepingAliases(
    siteId: string,
    raw: string | null,
    siteLanguages: string[]
  ) {
    const existing = await this.prisma.siteDomain.findMany({
      where: { siteId },
      select: { domain: true, defaultLang: true, isPrimary: true },
    });
    const primaryHost = raw?.trim() ? normalizeDomainHost(raw) : null;
    if (raw?.trim() && !primaryHost) {
      throw new BadRequestException(`Érvénytelen domain: „${raw.trim()}”. Példa: pelda.hu`);
    }
    const aliases = existing.filter((row) => !row.isPrimary && row.domain !== primaryHost);
    await this.syncDomains(
      siteId,
      [
        ...(primaryHost
          ? [{ domain: primaryHost, defaultLang: siteLanguages[0] || "hu", isPrimary: true }]
          : []),
        ...aliases.map((row) => ({
          domain: row.domain,
          defaultLang: row.defaultLang,
          isPrimary: false,
        })),
      ],
      siteLanguages
    );
  }

  /**
   * Basic cannot store a domain. Pro may store one primary host plus aliases up to domainAliasesMax,
   * even while customDomainEnabled is false. Business follows the same alias ceiling.
   */
  private async assertCanSaveDomains(siteId: string, count: number) {
    const allowance = await this.domainAllowance(siteId);
    if (
      !sitePlanAllowsCustomDomain({
        features: { customDomainEnabled: allowance.customDomainEnabled },
        limits: { domainAliasesMax: allowance.domainAliasesMax },
      })
    ) {
      throw new BadRequestException("A Basic csomagban nem lehet saját domaint beállítani.");
    }
    const aliases = Math.max(count - 1, 0);
    if (Number.isFinite(allowance.domainAliasesMax) && aliases > allowance.domainAliasesMax) {
      const planLabel =
        allowance.plan === "PRO" ? "Pro" : allowance.plan === "BUSINESS" ? "Business" : "Basic";
      throw new BadRequestException(
        `A ${planLabel} csomagban a saját domain mellé legfeljebb ${allowance.domainAliasesMax} további domain adható meg.`
      );
    }
  }

  private asPlanKey(value: string | null | undefined): "BASIC" | "PRO" | "BUSINESS" {
    const key = (value || "").toUpperCase();
    if (key === "PRO" || key === "BUSINESS") return key;
    return "BASIC";
  }

  private async domainAllowance(siteId: string) {
    const [site, subscription, brand] = await Promise.all([
      this.prisma.site.findUnique({ where: { id: siteId }, select: { plan: true } }),
      this.prisma.siteSubscription.findUnique({
        where: { siteId },
        select: { plan: true, status: true, validUntil: true },
      }),
      this.prisma.brand.findFirst({
        orderBy: { createdAt: "asc" },
        select: { planOverrides: true },
      }),
    ]);
    const fromSite = this.asPlanKey(site?.plan);
    let fromSub: "BASIC" | "PRO" | "BUSINESS" = "BASIC";
    if (subscription?.status === "ACTIVE") {
      const expired = subscription.validUntil ? subscription.validUntil.getTime() < Date.now() : false;
      if (!expired) fromSub = this.asPlanKey(subscription.plan);
    }
    const rank = { BASIC: 0, PRO: 1, BUSINESS: 2 };
    const plan = rank[fromSub] > rank[fromSite] ? fromSub : fromSite;
    const override = ((brand?.planOverrides as any)?.[plan] || {}) as {
      limits?: { domainAliasesMax?: number };
      features?: { customDomainEnabled?: boolean };
    };
    const base = PLAN_DEFS[plan];
    return {
      plan,
      domainAliasesMax: override.limits?.domainAliasesMax ?? base.limits.domainAliasesMax,
      customDomainEnabled: override.features?.customDomainEnabled ?? base.features.customDomainEnabled,
    };
  }

  private async assertCanGrowLanguages(siteId: string, current: string[], next: string[]) {
    if (next.length <= current.length) return;
    const max = (await this.entitlements.getBySiteId(siteId)).limits.languagesMax;
    if (Number.isFinite(max) && next.length > max) {
      throw new BadRequestException(`Ebben a csomagban legfeljebb ${max} nyelv használható.`);
    }
  }

  private async ensureSiteKeys(siteId: string, slug: string, languages: string[]) {
    for (const lang of languages) {
      const existingKey = await this.prisma.siteKey.findFirst({
        where: { siteId, lang, slug },
      });
      if (!existingKey) {
        await this.prisma.siteKey.create({
          data: { siteId, lang, slug, isPrimary: true, isActive: true },
        });
      } else if (!existingKey.isActive || !existingKey.isPrimary) {
        await this.prisma.siteKey.update({
          where: { id: existingKey.id },
          data: { isActive: true, isPrimary: true },
        });
      }
    }
  }

  async findAll() {
    const sortDomains = <T extends { siteDomains?: Array<{ isPrimary: boolean; domain: string }> }>(
      sites: T[]
    ) =>
      sites.map((site) => ({
        ...site,
        // Sort siteDomains in memory to avoid database schema dependency issues
        siteDomains: (site.siteDomains || []).sort((a, b) => {
          if (a.isPrimary === b.isPrimary) {
            return a.domain.localeCompare(b.domain);
          }
          return a.isPrimary ? -1 : 1;
        }),
      }));

    try {
      const sites = await this.prisma.site.findMany({
        include: {
          translations: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          siteDomains: {
            where: { isActive: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return sortDomains(sites);
    } catch (error: unknown) {
      console.error("Error in AdminSiteService.findAll:", error);
      // Optional columns (theme, listIntro*, gaMeasurementId, landingHtml) may lag migrate/generate.
      // Retry with a conservative select so /admin/places and the rest of the admin shell stay up.
      if (!isMissingColumn(error)) {
        throw error;
      }
      try {
        const sites = await this.prisma.site.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            isActive: true,
            languages: true,
            primaryDomain: true,
            plan: true,
            planStatus: true,
            planValidUntil: true,
            planLimits: true,
            billingEmail: true,
            billingMeta: true,
            allowPublicRegistration: true,
            brandId: true,
            createdAt: true,
            updatedAt: true,
            translations: {
              select: {
                id: true,
                siteId: true,
                lang: true,
                name: true,
                shortDescription: true,
                description: true,
                heroImage: true,
                seoTitle: true,
                seoDescription: true,
                seoImage: true,
                seoKeywords: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
            siteDomains: {
              where: { isActive: true },
            },
          },
        } as any);
        return sortDomains(
          (sites as any[]).map((site) => ({
            ...site,
            gaMeasurementId: null,
            theme: null,
            translations: (site.translations || []).map((translation: Record<string, unknown>) => ({
              ...translation,
              landingHtml: null,
              listIntroHtml: null,
              listIntroImage: null,
            })),
          }))
        );
      } catch (retryError: any) {
        if (
          retryError?.message?.includes("does not exist") ||
          retryError?.code === "P2021" ||
          retryError?.code === "P2022" ||
          retryError?.meta?.driverAdapterError?.name === "ColumnNotFound"
        ) {
          throw new Error(
            "Database schema is out of sync. Please run migrations: npx prisma migrate deploy"
          );
        }
        throw retryError;
      }
    }
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        translations: true,
        brand: true,
        siteDomains: true,
        siteKeys: {
          orderBy: [{ isPrimary: "desc" }, { lang: "asc" }],
        },
        siteInstances: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException("Site not found");
    }

    // Calculate usage statistics
    const [placesCount, featuredCount, eventsCount] = await Promise.all([
      this.prisma.place.count({
        where: { siteId: id, isActive: true },
      }),
      this.prisma.place.count({
        where: {
          siteId: id,
          isFeatured: true,
          OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
        },
      }),
      this.prisma.event.count({
        where: {
          siteId: id,
          isActive: true,
          startDate: { gte: new Date() },
        },
      }),
    ]);

    return {
      ...site,
      usage: {
        places: placesCount,
        featured: featuredCount,
        events: eventsCount,
      },
    };
  }

  async create(dto: CreateSiteDto) {
    // Check if brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: dto.brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${dto.brandId} not found`);
    }

    // Normalize slug: remove accents and ensure it's URL-friendly
    const normalizedSlug = generateSlug(dto.slug);
    if (!normalizedSlug || normalizedSlug.trim() === "") {
      throw new BadRequestException("Invalid slug: slug cannot be empty after normalization");
    }

    // Check if slug already exists
    const existingSite = await this.prisma.site.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existingSite) {
      throw new BadRequestException(`Site with slug "${normalizedSlug}" already exists`);
    }

    // Note: SiteKey unique constraint is now [siteId, lang, slug], so multiple sites
    // can have the same slug for the same language. No need to check for global uniqueness.

    const publishedLanguages =
      normalizeLanguageList(
        dto.languages?.length ? dto.languages : dto.translations.map((item) => item.lang)
      ) || [];
    const languages = publishedLanguages.length ? publishedLanguages : ["hu", "en", "de"];

    // Create site with translations. landing/listIntro columns optional until migrated.
    const translationRows = dto.translations.map((t) => ({
      lang: t.lang,
      name: t.name,
      shortDescription: t.shortDescription ?? null,
      description: t.description ?? null,
      heroImage: t.heroImage ?? null,
      landingHtml: t.landingHtml ?? null,
      listIntroHtml: t.listIntroHtml ?? null,
      listIntroImage: t.listIntroImage ?? null,
      seoTitle: t.seoTitle ?? null,
      seoDescription: t.seoDescription ?? null,
      seoImage: t.seoImage ?? null,
      seoKeywords: t.seoKeywords ?? [],
    }));
    const createPayload = {
      slug: normalizedSlug, // Use normalized slug (accent-free)
      brandId: dto.brandId,
      isActive: dto.isActive ?? true,
      primaryDomain: null as string | null,
      languages,
      translations: { create: translationRows },
    };
    let site;
    try {
      site = await this.prisma.site.create({
        data: createPayload,
        include: { translations: true, brand: true },
      });
    } catch (error) {
      const optionalMissing =
        isMissingColumn(error, "landingHtml") ||
        isMissingColumn(error, "listIntroHtml") ||
        isMissingColumn(error, "listIntroImage") ||
        isMissingColumn(error);
      if (!optionalMissing) throw error;
      site = await this.prisma.site.create({
        data: {
          ...createPayload,
          translations: {
            create: translationRows.map(
              ({
                landingHtml: _landingHtml,
                listIntroHtml: _listIntroHtml,
                listIntroImage: _listIntroImage,
                ...rest
              }) => rest
            ),
          },
        },
        include: { translations: true, brand: true },
      });
    }

    // A site key per published language keeps /:lang/:siteKey resolvable.
    const createdSiteKeys: string[] = [];

    for (const lang of languages) {
      try {
        // Check if SiteKey already exists (shouldn't happen, but just in case)
        const existingKey = await this.prisma.siteKey.findFirst({
          where: {
            siteId: site.id,
            lang,
            slug: normalizedSlug,
          },
        });

        if (!existingKey) {
          const createdKey = await this.prisma.siteKey.create({
            data: {
              siteId: site.id,
              lang,
              slug: normalizedSlug, // Use normalized slug (accent-free) as the public-facing slug
              isPrimary: true,
              isActive: true,
            },
          });
          createdSiteKeys.push(`${lang}:${createdKey.id}`);
        } else {
          // Ensure existing SiteKey is active and primary
          if (!existingKey.isActive || !existingKey.isPrimary) {
            await this.prisma.siteKey.update({
              where: { id: existingKey.id },
              data: { isActive: true, isPrimary: true },
            });
          } else {
          }
          createdSiteKeys.push(`${lang}:${existingKey.id}`);
        }
      } catch (error: any) {
        // Log error but don't fail site creation - SiteKey creation is important but not critical
        console.error(
          `❌ Failed to create SiteKey for site ${site.id}, lang ${lang}, slug ${normalizedSlug}:`,
          error.message
        );
        console.error(`   Error details:`, error);
        // Re-throw only if it's a critical error (not a duplicate key error)
        if (
          !error.message?.includes("Unique constraint") &&
          !error.message?.includes("duplicate")
        ) {
          throw error;
        }
      }
    }

    // Verify that SiteKeys were created
    if (createdSiteKeys.length === 0) {
      console.warn(`⚠️  WARNING: No SiteKeys were created for site ${site.id} (${normalizedSlug})`);
      console.warn(
        `   This will cause "Site not found" errors. Please run: pnpm db:ensure-site-keys`
      );
    } else if (createdSiteKeys.length < languages.length) {
      console.warn(
        `⚠️  WARNING: Only ${createdSiteKeys.length}/${languages.length} SiteKeys were created for site ${site.id}`
      );
      console.warn(`   Created: ${createdSiteKeys.join(", ")}`);
      console.warn(`   Please run: pnpm db:ensure-site-keys to fix missing SiteKeys`);
    } else {
    }

    // Create SiteInstance records for all languages that have translations
    // This ensures the site has SiteInstance entries for all configured languages
    const createdInstances: string[] = [];
    let isFirstInstance = true;

    for (const translation of site.translations) {
      const lang = translation.lang;

      // Check if SiteInstance already exists (shouldn't happen, but just in case)
      const existingInstance = await this.prisma.siteInstance.findUnique({
        where: {
          siteId_lang: {
            siteId: site.id,
            lang,
          },
        },
      });

      if (!existingInstance) {
        try {
          await this.prisma.siteInstance.create({
            data: {
              siteId: site.id,
              lang,
              isDefault: isFirstInstance, // First instance is default
              features: {
                isCrawlable: true, // Default: allow crawling
                enableEvents: true, // Default: enable events
                enableBlog: false, // Default: disable blog
                enableStaticPages: true, // Default: enable static pages
              },
            },
          });
          createdInstances.push(lang);
          isFirstInstance = false;
        } catch (error: any) {
          console.error(
            `❌ Failed to create SiteInstance for site ${site.id}, lang ${lang}:`,
            error.message
          );
          // Don't fail site creation if SiteInstance creation fails
        }
      } else {
        isFirstInstance = false;
      }
    }

    const createdLanguages = languages.length ? languages : ["hu"];
    if (dto.domains !== undefined) {
      await this.syncDomains(site.id, dto.domains, createdLanguages);
    } else if (dto.primaryDomain !== undefined) {
      await this.syncDomains(
        site.id,
        dto.primaryDomain ? [{ domain: dto.primaryDomain, isPrimary: true }] : [],
        createdLanguages
      );
    }

    const requestedPlan = dto.plan;
    const subscriptionPlan =
      requestedPlan === "pro"
        ? "PRO"
        : requestedPlan === "business"
          ? "BUSINESS"
          : requestedPlan === "municipal"
            ? "MUNICIPAL"
            : requestedPlan
              ? "BASIC"
              : "FREE";
    await this.prisma.siteSubscription.create({
      data: {
        siteId: site.id,
        plan: subscriptionPlan,
        status: "ACTIVE",
        manualOverride: Boolean(requestedPlan),
      },
    });

    if (createdInstances.length === 0 && site.translations.length > 0) {
      console.warn(
        `⚠️  WARNING: No SiteInstances were created for site ${site.id} (${normalizedSlug})`
      );
      console.warn(`   This will cause "SiteInstance not found" errors in the admin interface.`);
    } else if (createdInstances.length > 0) {
    }

    // Return site with SiteKeys included for verification
    // Since we just created the site, findUnique should never return null
    const result = await this.prisma.site.findUnique({
      where: { id: site.id },
      include: {
        translations: true,
        brand: true,
        siteKeys: {
          where: { isActive: true },
          select: { id: true, lang: true, slug: true, isActive: true, isPrimary: true },
        },
        siteInstances: {
          select: { id: true, lang: true, isDefault: true },
        },
      },
    });

    if (!result) {
      // This should never happen since we just created the site
      throw new Error(`Site ${site.id} was created but could not be retrieved`);
    }

    this.sitemapService.invalidate();
    return result;
  }

  async update(id: string, dto: UpdateSiteDto) {
    const site = await this.findOne(id);

    // Check if slug is being changed and if new slug already exists
    if (dto.slug && dto.slug !== site.slug) {
      // Normalize slug: remove accents and ensure it's URL-friendly
      const normalizedSlug = generateSlug(dto.slug);
      if (!normalizedSlug || normalizedSlug.trim() === "") {
        throw new BadRequestException("Invalid slug: slug cannot be empty after normalization");
      }

      const existingSite = await this.prisma.site.findUnique({
        where: { slug: normalizedSlug },
      });

      if (existingSite) {
        throw new BadRequestException(`Site with slug "${normalizedSlug}" already exists`);
      }

      // Update dto.slug to normalized version
      dto.slug = normalizedSlug;
    }

    // Check if brand exists (if brandId is being updated)
    if (dto.brandId !== undefined) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${dto.brandId} not found`);
      }
    }

    const updateData: any = {};
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.brandId !== undefined) updateData.brandId = dto.brandId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    const siteLanguages = normalizeLanguageList(site.languages ?? []);
    const languageList = siteLanguages.length ? siteLanguages : ["hu"];
    if (dto.domains !== undefined) {
      await this.syncDomains(id, dto.domains, languageList);
    } else if (dto.primaryDomain !== undefined) {
      await this.syncPrimaryKeepingAliases(id, dto.primaryDomain, languageList);
    }

    // Billing/subscription fields
    if (dto.plan !== undefined) updateData.plan = dto.plan;
    if (dto.planStatus !== undefined) updateData.planStatus = dto.planStatus;
    if (dto.planValidUntil !== undefined) {
      updateData.planValidUntil = dto.planValidUntil
        ? typeof dto.planValidUntil === "string"
          ? new Date(dto.planValidUntil)
          : dto.planValidUntil
        : null;
    }
    if (dto.planLimits !== undefined) updateData.planLimits = dto.planLimits;
    if (dto.billingEmail !== undefined) updateData.billingEmail = dto.billingEmail;
    if (dto.languages !== undefined) {
      const next = normalizeLanguageList(dto.languages);
      if (!next.length) {
        throw new BadRequestException("A településnek legalább egy nyelve kell.");
      }
      const current = normalizeLanguageList(site.languages ?? []);
      await this.assertCanGrowLanguages(id, current, next);
      updateData.languages = next;
    }

    if (dto.allowPublicRegistration !== undefined) {
      // Only allow setting this for pro/business plans
      // Basic plan always allows public registration
      const currentPlan = dto.plan || site.plan;
      if (currentPlan === "basic" && dto.allowPublicRegistration === false) {
        throw new BadRequestException(
          "Public registration cannot be disabled for basic plan. Upgrade to pro or business plan to use this feature."
        );
      }
      updateData.allowPublicRegistration = dto.allowPublicRegistration;
    }

    if (dto.gaMeasurementId !== undefined) {
      try {
        updateData.gaMeasurementId = normalizeGaMeasurementId(dto.gaMeasurementId);
      } catch {
        throw new BadRequestException(
          "Invalid Google Analytics measurement ID. Expected format: G-XXXXXXXX"
        );
      }
    }

    if (dto.theme !== undefined) {
      try {
        updateData.theme = sanitizeSiteTheme(dto.theme);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid theme colors. Use #RRGGBB hex values."
        );
      }
    }

    try {
      await this.prisma.site.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (
        updateData.gaMeasurementId !== undefined &&
        isMissingColumn(error, "gaMeasurementId")
      ) {
        throw new BadRequestException(
          "Google Analytics field is not available yet. Run the database migration first."
        );
      }
      if (updateData.theme !== undefined && isMissingColumn(error, "theme")) {
        throw new BadRequestException(
          "Site theme field is not available yet. Run the database migration first."
        );
      }
      throw error;
    }

    if (dto.plan) {
      const subscriptionPlan =
        dto.plan === "pro"
          ? "PRO"
          : dto.plan === "business"
            ? "BUSINESS"
            : dto.plan === "municipal"
              ? "MUNICIPAL"
              : "BASIC";
      await this.prisma.siteSubscription.upsert({
        where: { siteId: id },
        update: { plan: subscriptionPlan, manualOverride: true, ladderSuspended: false },
        create: {
          siteId: id,
          plan: subscriptionPlan,
          status: "ACTIVE",
          manualOverride: true,
          ladderSuspended: false,
        },
      });
    }

    if (updateData.languages) {
      const siteSlug = dto.slug ? generateSlug(dto.slug) : generateSlug(site.slug);
      await this.ensureSiteKeys(id, siteSlug, updateData.languages);
    }

    if (dto.translations) {
      for (const translation of dto.translations) {
        const code = normalizeLanguageCode(translation.lang);
        if (!code) {
          throw new BadRequestException(`Érvénytelen nyelvkód: "${translation.lang}".`);
        }
        translation.lang = code;
        // Check if translation already exists
        const existingTranslation = await this.prisma.siteTranslation.findUnique({
          where: {
            siteId_lang: {
              siteId: id,
              lang: translation.lang,
            },
          },
        });

        const translationBase = {
          name: translation.name,
          shortDescription: translation.shortDescription ?? null,
          description: translation.description ?? null,
          heroImage: translation.heroImage ?? null,
          seoTitle: translation.seoTitle ?? null,
          seoDescription: translation.seoDescription ?? null,
          seoImage: translation.seoImage ?? null,
          seoKeywords: translation.seoKeywords ?? [],
        };
        const landingPatch =
          translation.landingHtml !== undefined
            ? { landingHtml: translation.landingHtml || null }
            : {};
        const listIntroPatch = {
          ...(translation.listIntroHtml !== undefined
            ? { listIntroHtml: translation.listIntroHtml || null }
            : {}),
          ...(translation.listIntroImage !== undefined
            ? { listIntroImage: translation.listIntroImage || null }
            : {}),
        };
        try {
          await this.prisma.siteTranslation.upsert({
            where: {
              siteId_lang: {
                siteId: id,
                lang: translation.lang,
              },
            },
            update: { ...translationBase, ...landingPatch, ...listIntroPatch },
            create: {
              siteId: id,
              lang: translation.lang,
              ...translationBase,
              landingHtml: translation.landingHtml || null,
              listIntroHtml: translation.listIntroHtml || null,
              listIntroImage: translation.listIntroImage || null,
            },
          });
        } catch (error) {
          const optionalMissing =
            isMissingColumn(error, "landingHtml") ||
            isMissingColumn(error, "listIntroHtml") ||
            isMissingColumn(error, "listIntroImage") ||
            isMissingColumn(error);
          if (!optionalMissing) throw error;
          try {
            await this.prisma.siteTranslation.upsert({
              where: {
                siteId_lang: {
                  siteId: id,
                  lang: translation.lang,
                },
              },
              update: { ...translationBase, ...landingPatch },
              create: {
                siteId: id,
                lang: translation.lang,
                ...translationBase,
                landingHtml: translation.landingHtml || null,
              },
            });
          } catch (retryError) {
            if (!isMissingColumn(retryError, "landingHtml") && !isMissingColumn(retryError)) {
              throw retryError;
            }
            await this.prisma.siteTranslation.upsert({
              where: {
                siteId_lang: {
                  siteId: id,
                  lang: translation.lang,
                },
              },
              update: translationBase,
              create: {
                siteId: id,
                lang: translation.lang,
                ...translationBase,
              },
            });
          }
        }

        // If this is a new translation (didn't exist before), ensure SiteKey exists for this language
        // Note: We should ensure SiteKey exists for ALL languages, not just when translation is added
        // But for now, we'll create it when translation is added to maintain backward compatibility
        if (!existingTranslation) {
          // Use normalized slug (either from dto or existing site slug)
          const siteSlug = dto.slug ? generateSlug(dto.slug) : generateSlug(site.slug);
          // Check if SiteKey already exists for this site+lang+slug combination
          // Note: Unique constraint is now [siteId, lang, slug], so we check site-specific
          const existingKey = await this.prisma.siteKey.findFirst({
            where: {
              siteId: id,
              lang: translation.lang,
              slug: siteSlug,
            },
          });

          if (!existingKey) {
            await this.prisma.siteKey.create({
              data: {
                siteId: id,
                lang: translation.lang,
                slug: siteSlug, // Use normalized slug (accent-free)
                isPrimary: true,
                isActive: true,
              },
            });
          }
        }
      }

      const siteSlug = dto.slug ? generateSlug(dto.slug) : generateSlug(site.slug);
      const stored = await this.prisma.site.findUnique({
        where: { id },
        select: { languages: true },
      });
      const fromTranslations = dto.translations.map((item) => item.lang);
      const published = normalizeLanguageList([...(stored?.languages ?? []), ...fromTranslations]);
      if (published.length) {
        const current = normalizeLanguageList(stored?.languages ?? []);
        await this.assertCanGrowLanguages(id, current, published);
        if (published.join() !== current.join()) {
          await this.prisma.site.update({ where: { id }, data: { languages: published } });
        }
        await this.ensureSiteKeys(id, siteSlug, published);
      }
    }

    this.sitemapService.invalidate();
    return this.findOne(id);
  }

  async remove(id: string) {
    const site = await this.findOne(id);

    // Check if site is used by any users
    // Query users that have this site assigned
    const usersWithSite = await (this.prisma as any).user.findMany({
      where: {
        sites: {
          some: {
            siteId: id,
          },
        },
      },
      select: { id: true },
    });
    const usersCount = usersWithSite.length;

    if (usersCount > 0) {
      throw new BadRequestException(
        `A régiót ${usersCount} felhasználó használja — előbb vedd le róluk, vagy inkább inaktiváld.`
      );
    }

    await this.prisma.site.delete({
      where: { id },
    });

    this.sitemapService.invalidate();
    return { message: "Site deleted successfully" };
  }
}

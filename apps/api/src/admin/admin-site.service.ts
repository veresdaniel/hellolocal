import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, SitePlan } from "@prisma/client";
import { generateSlug } from "../slug/slug.helper";

export interface CreateSiteDto {
  slug: string;
  brandId: string; // Required: site must belong to a brand
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
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
}

@Injectable()
export class AdminSiteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
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

      // Sort siteDomains in memory to avoid database schema dependency issues
      return sites.map((site) => ({
        ...site,
        siteDomains: (site.siteDomains || []).sort((a, b) => {
          // Sort by isPrimary (true first), then by domain
          if (a.isPrimary === b.isPrimary) {
            return a.domain.localeCompare(b.domain);
          }
          return a.isPrimary ? -1 : 1;
        }),
      }));
    } catch (error: any) {
      console.error("Error in AdminSiteService.findAll:", error);
      // If the error is about missing table/column, provide helpful message
      // P2021: Table does not exist
      // P2022: Column does not exist
      if (
        error?.message?.includes("does not exist") || 
        error?.code === "P2021" || 
        error?.code === "P2022" ||
        error?.meta?.driverAdapterError?.name === "ColumnNotFound"
      ) {
        throw new Error(
          "Database schema is out of sync. Please run migrations: npx prisma migrate deploy"
        );
      }
      throw error;
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
          OR: [
            { featuredUntil: null },
            { featuredUntil: { gt: new Date() } },
          ],
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

    // Create site with translations
    const site = await this.prisma.site.create({
      data: {
        slug: normalizedSlug, // Use normalized slug (accent-free)
        brandId: dto.brandId,
        isActive: dto.isActive ?? true,
        primaryDomain: dto.primaryDomain ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            shortDescription: t.shortDescription ?? null,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      include: {
        translations: true,
        brand: true,
      },
    });

    // Create SiteKey records for ALL languages (hu, en, de)
    // This ensures the site is accessible via any language route, even if translation doesn't exist yet
    // The middleware will fallback to Site.slug if SiteKey is not found, but it's better to have all SiteKeys
    const allLanguages: Lang[] = ["hu", "en", "de"];
    const createdSiteKeys: string[] = [];
    
    for (const lang of allLanguages) {
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
          console.log(`✅ Created SiteKey: ${createdKey.id} for site ${site.id}, lang ${lang}, slug ${normalizedSlug}`);
        } else {
          // Ensure existing SiteKey is active and primary
          if (!existingKey.isActive || !existingKey.isPrimary) {
            await this.prisma.siteKey.update({
              where: { id: existingKey.id },
              data: { isActive: true, isPrimary: true },
            });
            console.log(`✅ Updated SiteKey: ${existingKey.id} for site ${site.id}, lang ${lang}`);
          } else {
            console.log(`ℹ️  SiteKey already exists and is active: ${existingKey.id} for site ${site.id}, lang ${lang}`);
          }
          createdSiteKeys.push(`${lang}:${existingKey.id}`);
        }
      } catch (error: any) {
        // Log error but don't fail site creation - SiteKey creation is important but not critical
        console.error(`❌ Failed to create SiteKey for site ${site.id}, lang ${lang}, slug ${normalizedSlug}:`, error.message);
        console.error(`   Error details:`, error);
        // Re-throw only if it's a critical error (not a duplicate key error)
        if (!error.message?.includes("Unique constraint") && !error.message?.includes("duplicate")) {
          throw error;
        }
      }
    }

    // Verify that SiteKeys were created
    if (createdSiteKeys.length === 0) {
      console.warn(`⚠️  WARNING: No SiteKeys were created for site ${site.id} (${normalizedSlug})`);
      console.warn(`   This will cause "Site not found" errors. Please run: pnpm db:ensure-site-keys`);
    } else if (createdSiteKeys.length < allLanguages.length) {
      console.warn(`⚠️  WARNING: Only ${createdSiteKeys.length}/${allLanguages.length} SiteKeys were created for site ${site.id}`);
      console.warn(`   Created: ${createdSiteKeys.join(", ")}`);
      console.warn(`   Please run: pnpm db:ensure-site-keys to fix missing SiteKeys`);
    } else {
      console.log(`✅ Successfully created/verified ${createdSiteKeys.length} SiteKeys for site ${site.id} (${normalizedSlug})`);
    }

    // Create SiteInstance records for all languages that have translations
    // This ensures the site has SiteInstance entries for all configured languages
    console.log(`🔧 Creating SiteInstance records for site ${site.id}...`);
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
          console.log(`✅ Created SiteInstance: ${site.id} (${lang}), isDefault: ${isFirstInstance}`);
          isFirstInstance = false;
        } catch (error: any) {
          console.error(`❌ Failed to create SiteInstance for site ${site.id}, lang ${lang}:`, error.message);
          // Don't fail site creation if SiteInstance creation fails
        }
      } else {
        console.log(`ℹ️  SiteInstance already exists: ${site.id} (${lang})`);
        isFirstInstance = false;
      }
    }

    if (createdInstances.length === 0 && site.translations.length > 0) {
      console.warn(`⚠️  WARNING: No SiteInstances were created for site ${site.id} (${normalizedSlug})`);
      console.warn(`   This will cause "SiteInstance not found" errors in the admin interface.`);
    } else if (createdInstances.length > 0) {
      console.log(`✅ Successfully created ${createdInstances.length} SiteInstance(s) for site ${site.id} (${normalizedSlug})`);
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
    if (dto.primaryDomain !== undefined) updateData.primaryDomain = dto.primaryDomain;
    
    // Billing/subscription fields
    if (dto.plan !== undefined) updateData.plan = dto.plan;
    if (dto.planStatus !== undefined) updateData.planStatus = dto.planStatus;
    if (dto.planValidUntil !== undefined) {
      updateData.planValidUntil = dto.planValidUntil 
        ? (typeof dto.planValidUntil === "string" ? new Date(dto.planValidUntil) : dto.planValidUntil)
        : null;
    }
    if (dto.planLimits !== undefined) updateData.planLimits = dto.planLimits;
    if (dto.billingEmail !== undefined) updateData.billingEmail = dto.billingEmail;
    if (dto.allowPublicRegistration !== undefined) {
      // Only allow setting this for pro/business plans
      // Basic plan always allows public registration
      const currentPlan = dto.plan || site.plan;
      if (currentPlan === "basic" && dto.allowPublicRegistration === false) {
        throw new BadRequestException("Public registration cannot be disabled for basic plan. Upgrade to pro or business plan to use this feature.");
      }
      updateData.allowPublicRegistration = dto.allowPublicRegistration;
    }

    await this.prisma.site.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        // Check if translation already exists
        const existingTranslation = await this.prisma.siteTranslation.findUnique({
          where: {
            siteId_lang: {
              siteId: id,
              lang: translation.lang,
            },
          },
        });

        await this.prisma.siteTranslation.upsert({
          where: {
            siteId_lang: {
              siteId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
          create: {
            siteId: id,
            lang: translation.lang,
            name: translation.name,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
            heroImage: translation.heroImage ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            seoImage: translation.seoImage ?? null,
            seoKeywords: translation.seoKeywords ?? [],
          },
        });

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
      
      // After processing translations, ensure SiteKey exists for ALL languages
      // This ensures the site is accessible via any language route
      const siteSlug = dto.slug ? generateSlug(dto.slug) : generateSlug(site.slug);
      const allLanguages: Lang[] = ["hu", "en", "de"];
      for (const lang of allLanguages) {
        const existingKey = await this.prisma.siteKey.findFirst({
          where: {
            siteId: id,
            lang,
            slug: siteSlug,
          },
        });
        
        if (!existingKey) {
          await this.prisma.siteKey.create({
            data: {
              siteId: id,
              lang,
              slug: siteSlug,
              isPrimary: true,
              isActive: true,
            },
          });
        } else if (!existingKey.isActive || !existingKey.isPrimary) {
          // Ensure existing SiteKey is active and primary
          await this.prisma.siteKey.update({
            where: { id: existingKey.id },
            data: { isActive: true, isPrimary: true },
          });
        }
      }
    }

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
        `Cannot delete site: it is used by ${usersCount} user(s). Deactivate it instead.`
      );
    }

    await this.prisma.site.delete({
      where: { id },
    });

    return { message: "Site deleted successfully" };
  }
}


import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

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
}

@Injectable()
export class AdminSiteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.site.findMany({
        include: {
          translations: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error in AdminSiteService.findAll:", error);
      throw error;
    }
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        translations: true,
        brand: true,
      },
    });

    if (!site) {
      throw new NotFoundException("Site not found");
    }

    return site;
  }

  async create(dto: CreateSiteDto) {
    // Check if brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: dto.brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${dto.brandId} not found`);
    }

    // Check if slug already exists
    const existingSite = await this.prisma.site.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSite) {
      throw new BadRequestException(`Site with slug "${dto.slug}" already exists`);
    }

    // Note: SiteKey unique constraint is now [siteId, lang, slug], so multiple sites
    // can have the same slug for the same language. No need to check for global uniqueness.

    // Create site with translations
    const site = await this.prisma.site.create({
      data: {
        slug: dto.slug,
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

    // Create SiteKey records for each language that has a translation
    // This enables multi-site mode to work with this site
    for (const translation of dto.translations) {
      await this.prisma.siteKey.create({
        data: {
          siteId: site.id,
          lang: translation.lang,
          slug: dto.slug, // Use site slug as the public-facing slug
          isPrimary: true,
          isActive: true,
        },
      });
    }

    return site;
  }

  async update(id: string, dto: UpdateSiteDto) {
    const site = await this.findOne(id);

    // Check if slug is being changed and if new slug already exists
    if (dto.slug && dto.slug !== site.slug) {
      const existingSite = await this.prisma.site.findUnique({
        where: { slug: dto.slug },
      });

      if (existingSite) {
        throw new BadRequestException(`Site with slug "${dto.slug}" already exists`);
      }
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

        // If this is a new translation (didn't exist before), create SiteKey for it
        if (!existingTranslation) {
          const siteSlug = dto.slug ?? site.slug;
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
                slug: siteSlug,
                isPrimary: true,
                isActive: true,
              },
            });
          }
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


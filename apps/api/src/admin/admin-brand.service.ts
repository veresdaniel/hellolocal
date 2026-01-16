// src/admin/admin-brand.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ERROR_MESSAGES } from "../common/constants/error-messages";
import { PrismaService } from "../prisma/prisma.service";
import { isValidImageUrl, sanitizeImageUrl } from "../common/url-validation";

export interface CreateBrandDto {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: any;
  placeholders?: {
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
  } | null;
  mapDefaults?: {
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
    townId?: string | null;
  } | null;
}

export interface UpdateBrandDto {
  name?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: any;
  placeholders?: {
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
  } | null;
  mapDefaults?: {
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
    townId?: string | null;
  } | null;
}

@Injectable()
export class AdminBrandService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        sites: {
          select: {
            id: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        sites: {
          select: {
            id: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND_BRAND);
    }

    return brand;
  }

  async create(dto: CreateBrandDto) {
    // Validate image URLs
    if (dto.logoUrl && !sanitizeImageUrl(dto.logoUrl)) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_LOGO_URL);
    }

    if (dto.faviconUrl && !sanitizeImageUrl(dto.faviconUrl)) {
      throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_FAVICON_URL);
    }

    // Validate placeholder image URLs
    if (dto.placeholders) {
      const placeholderFields = [
        "defaultPlaceholderCardImage",
        "defaultPlaceholderDetailHeroImage",
        "defaultEventPlaceholderCardImage",
        "brandBadgeIcon",
      ] as const;

      for (const field of placeholderFields) {
        const url = dto.placeholders[field];
        if (url && !sanitizeImageUrl(url)) {
          throw new BadRequestException(
            `Invalid ${field} URL. Only http:// and https:// URLs are allowed.`
          );
        }
      }
    }

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl ? sanitizeImageUrl(dto.logoUrl) : null,
        faviconUrl: dto.faviconUrl ? sanitizeImageUrl(dto.faviconUrl) : null,
        theme: dto.theme || undefined,
        placeholders: dto.placeholders || undefined,
        mapDefaults: dto.mapDefaults || undefined,
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    // Check if brand exists
    await this.findOne(id);

    // Validate image URLs
    if (dto.logoUrl !== undefined) {
      if (dto.logoUrl && !sanitizeImageUrl(dto.logoUrl)) {
        throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_LOGO_URL);
      }
    }

    if (dto.faviconUrl !== undefined) {
      if (dto.faviconUrl && !sanitizeImageUrl(dto.faviconUrl)) {
        throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST_INVALID_FAVICON_URL);
      }
    }

    // Validate placeholder image URLs
    if (dto.placeholders) {
      const placeholderFields = [
        "defaultPlaceholderCardImage",
        "defaultPlaceholderDetailHeroImage",
        "defaultEventPlaceholderCardImage",
        "brandBadgeIcon",
      ] as const;

      for (const field of placeholderFields) {
        const url = dto.placeholders[field];
        if (url && !sanitizeImageUrl(url)) {
          throw new BadRequestException(
            `Invalid ${field} URL. Only http:// and https:// URLs are allowed.`
          );
        }
      }
    }

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl ? sanitizeImageUrl(dto.logoUrl) : null;
    }

    if (dto.faviconUrl !== undefined) {
      updateData.faviconUrl = dto.faviconUrl ? sanitizeImageUrl(dto.faviconUrl) : null;
    }

    if (dto.theme !== undefined) {
      updateData.theme = dto.theme;
    }

    if (dto.placeholders !== undefined) {
      // Sanitize placeholder URLs
      const sanitizedPlaceholders = dto.placeholders
        ? {
            defaultPlaceholderCardImage: dto.placeholders.defaultPlaceholderCardImage
              ? sanitizeImageUrl(dto.placeholders.defaultPlaceholderCardImage)
              : null,
            defaultPlaceholderDetailHeroImage: dto.placeholders.defaultPlaceholderDetailHeroImage
              ? sanitizeImageUrl(dto.placeholders.defaultPlaceholderDetailHeroImage)
              : null,
            defaultEventPlaceholderCardImage: dto.placeholders.defaultEventPlaceholderCardImage
              ? sanitizeImageUrl(dto.placeholders.defaultEventPlaceholderCardImage)
              : null,
            brandBadgeIcon: dto.placeholders.brandBadgeIcon
              ? sanitizeImageUrl(dto.placeholders.brandBadgeIcon)
              : null,
          }
        : null;
      updateData.placeholders = sanitizedPlaceholders;
    }

    if (dto.mapDefaults !== undefined) {
      updateData.mapDefaults = dto.mapDefaults;
    }

    return this.prisma.brand.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    // Check if brand exists
    await this.findOne(id);

    // Check if brand is used by any sites
    const sites = await this.prisma.site.findMany({
      where: { brandId: id },
    });

    if (sites.length > 0) {
      throw new BadRequestException(
        `Cannot delete brand: it is used by ${sites.length} site(s). Please reassign sites to another brand first.`
      );
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }
}

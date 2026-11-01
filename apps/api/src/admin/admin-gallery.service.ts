import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../auth/rbac.service";
import { EntitlementsService } from "../entitlements/entitlements.service";

export interface GalleryImage {
  id: string; // stable id (uuid/cuid)
  src: string; // CDN url
  thumbSrc?: string; // optional CDN thumbnail
  width?: number;
  height?: number;
  alt?: string;
  caption?: string; // képaláírás
}

export interface CreateGalleryDto {
  siteId: string;
  placeId: string;
  eventId?: string | null;
  name?: string | null;
  images: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive?: boolean;
}

export interface UpdateGalleryDto {
  placeId?: string;
  eventId?: string | null;
  name?: string | null;
  images?: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive?: boolean;
}

@Injectable()
export class AdminGalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly entitlementsService: EntitlementsService
  ) {}

  async findAll(
    userId: string,
    siteId: string,
    placeId?: string,
    eventId?: string,
    page?: number,
    limit?: number
  ) {
    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, siteId, ["siteadmin", "editor"]);

    const where: any = { siteId };
    if (placeId) {
      where.placeId = placeId;
    }
    if (eventId) {
      where.eventId = eventId;
    }

    // Default pagination values
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 10;

    // Get total count
    const total = await this.prisma.gallery.count({ where });

    // Get paginated results
    const galleries = await this.prisma.gallery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return {
      galleries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async findOne(userId: string, id: string, siteId: string) {
    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, siteId, ["siteadmin", "editor"]);

    const gallery = await this.prisma.gallery.findFirst({
      where: { id, siteId },
    });

    if (!gallery) {
      throw new NotFoundException("Gallery not found");
    }

    return gallery;
  }

  async create(userId: string, dto: CreateGalleryDto) {
    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, dto.siteId, ["siteadmin", "editor"]);

    // Check entitlements
    const entitlements = await this.entitlementsService.getBySiteId(dto.siteId);

    // Check total galleries limit
    if (entitlements.usage.galleriesCount >= entitlements.limits.galleriesMax) {
      throw new ForbiddenException(
        `Gallery limit reached. Maximum ${entitlements.limits.galleriesMax} galleries allowed for ${entitlements.plan} plan.`
      );
    }

    // Check images per gallery limit
    if (dto.images.length > entitlements.limits.imagesPerGalleryMax) {
      throw new ForbiddenException(
        `Image limit per gallery exceeded. Maximum ${entitlements.limits.imagesPerGalleryMax} images allowed for ${entitlements.plan} plan.`
      );
    }

    let placeId = typeof dto.placeId === "string" ? dto.placeId.trim() : "";
    if (!placeId && dto.eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: dto.eventId, siteId: dto.siteId },
        select: { placeId: true },
      });
      placeId = event?.placeId || "";
    }
    if (!placeId) {
      throw new BadRequestException("placeId is required (galleries belong to a place)");
    }

    const place = await this.prisma.place.findFirst({
      where: { id: placeId, siteId: dto.siteId },
      select: { id: true },
    });
    if (!place) {
      throw new BadRequestException("placeId must belong to the same site");
    }

    if (dto.eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: dto.eventId, siteId: dto.siteId, placeId },
        select: { id: true },
      });
      if (!event) {
        throw new BadRequestException("eventId must belong to the same place and site");
      }
    }

    const placeGalleriesCount = await this.prisma.gallery.count({
      where: { siteId: dto.siteId, placeId, isActive: true },
    });

    if (placeGalleriesCount >= entitlements.limits.galleriesPerPlaceMax) {
      throw new ForbiddenException(
        `Place gallery limit reached. Maximum ${entitlements.limits.galleriesPerPlaceMax} galleries per place allowed for ${entitlements.plan} plan.`
      );
    }

    // Check event-specific limits if eventId is provided
    if (dto.eventId) {
      const eventGalleriesCount = await this.prisma.gallery.count({
        where: { siteId: dto.siteId, eventId: dto.eventId, isActive: true },
      });

      if (eventGalleriesCount >= entitlements.limits.galleriesPerEventMax) {
        throw new ForbiddenException(
          `Event gallery limit reached. Maximum ${entitlements.limits.galleriesPerEventMax} galleries per event allowed for ${entitlements.plan} plan.`
        );
      }
    }

    return this.prisma.gallery.create({
      data: {
        siteId: dto.siteId,
        placeId,
        eventId: dto.eventId ?? null,
        name: dto.name ?? null,
        images: dto.images as any,
        layout: dto.layout ?? "grid",
        columns: (dto.columns as any) ?? null,
        aspect: dto.aspect ?? "auto",
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, userId: string, siteId: string, dto: UpdateGalleryDto) {
    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, siteId, ["siteadmin", "editor"]);

    const gallery = await this.findOne(userId, id, siteId);

    // Check entitlements if images are being updated
    if (dto.images !== undefined) {
      const entitlements = await this.entitlementsService.getBySiteId(siteId);

      if (dto.images.length > entitlements.limits.imagesPerGalleryMax) {
        throw new ForbiddenException(
          `Image limit per gallery exceeded. Maximum ${entitlements.limits.imagesPerGalleryMax} images allowed for ${entitlements.plan} plan.`
        );
      }
    }

    const nextPlaceId =
      dto.placeId !== undefined
        ? typeof dto.placeId === "string"
          ? dto.placeId.trim()
          : ""
        : gallery.placeId;
    if (dto.placeId !== undefined && !nextPlaceId) {
      throw new BadRequestException("placeId is required (galleries belong to a place)");
    }

    if (dto.placeId !== undefined && nextPlaceId !== gallery.placeId) {
      const place = await this.prisma.place.findFirst({
        where: { id: nextPlaceId, siteId },
        select: { id: true },
      });
      if (!place) {
        throw new BadRequestException("placeId must belong to the same site");
      }

      const entitlements = await this.entitlementsService.getBySiteId(siteId);
      const placeGalleriesCount = await this.prisma.gallery.count({
        where: {
          siteId,
          placeId: nextPlaceId,
          isActive: true,
          NOT: { id }, // Exclude current gallery
        },
      });

      if (placeGalleriesCount >= entitlements.limits.galleriesPerPlaceMax) {
        throw new ForbiddenException(
          `Place gallery limit reached. Maximum ${entitlements.limits.galleriesPerPlaceMax} galleries per place allowed for ${entitlements.plan} plan.`
        );
      }
    }

    // Check event-specific limits if eventId is being changed
    if (dto.eventId !== undefined && dto.eventId !== gallery.eventId) {
      if (dto.eventId) {
        const event = await this.prisma.event.findFirst({
          where: { id: dto.eventId, siteId, placeId: nextPlaceId },
          select: { id: true },
        });
        if (!event) {
          throw new BadRequestException("eventId must belong to the same place and site");
        }

        const entitlements = await this.entitlementsService.getBySiteId(siteId);
        const eventGalleriesCount = await this.prisma.gallery.count({
          where: {
            siteId,
            eventId: dto.eventId,
            isActive: true,
            NOT: { id }, // Exclude current gallery
          },
        });

        if (eventGalleriesCount >= entitlements.limits.galleriesPerEventMax) {
          throw new ForbiddenException(
            `Event gallery limit reached. Maximum ${entitlements.limits.galleriesPerEventMax} galleries per event allowed for ${entitlements.plan} plan.`
          );
        }
      }
    } else if (dto.placeId !== undefined && gallery.eventId) {
      // Place changed while keeping an event — ensure event still matches place
      const event = await this.prisma.event.findFirst({
        where: { id: gallery.eventId, siteId, placeId: nextPlaceId },
        select: { id: true },
      });
      if (!event) {
        throw new BadRequestException(
          "Existing eventId does not belong to the new place; clear or update eventId"
        );
      }
    }

    const updateData: any = {};
    if (dto.placeId !== undefined) {
      updateData.placeId = nextPlaceId;
    }
    if (dto.eventId !== undefined) updateData.eventId = dto.eventId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.images !== undefined) updateData.images = dto.images as any;
    if (dto.layout !== undefined) updateData.layout = dto.layout;
    if (dto.columns !== undefined) updateData.columns = dto.columns as any;
    if (dto.aspect !== undefined) updateData.aspect = dto.aspect;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.gallery.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(userId: string, id: string, siteId: string) {
    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, siteId, ["siteadmin", "editor"]);

    const gallery = await this.findOne(userId, id, siteId);

    await this.prisma.gallery.delete({
      where: { id },
    });

    return { success: true };
  }
}

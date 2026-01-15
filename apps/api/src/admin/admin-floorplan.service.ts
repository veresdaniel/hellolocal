// admin-floorplan.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminFeatureSubscriptionService } from "./admin-feature-subscription.service";
import { RbacService } from "../auth/rbac.service";

export interface CreateFloorplanDto {
  placeId: string;
  title?: string;
  imageUrl: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface UpdateFloorplanDto {
  title?: string;
  imageUrl?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

@Injectable()
export class AdminFloorplanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureSubscriptionService: AdminFeatureSubscriptionService,
    private readonly rbacService: RbacService
  ) {}

  /**
   * Get all floorplans for a place
   */
  async findAll(placeId: string, userId: string | "public-read") {
    // Get place to check siteId
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { siteId: true },
    });

    if (!place) {
      throw new NotFoundException(`Place with id ${placeId} not found`);
    }

    // RBAC check only for authenticated users
    if (userId !== "public-read") {
      await this.rbacService.checkSiteAccessWithUser(userId, place.siteId, ["siteadmin", "editor", "viewer"]);
    }

    // For public-read, check if there's an active subscription
    // Only return floorplans if the place has an active floorplan subscription
    if (userId === "public-read") {
      const entitlement = await this.featureSubscriptionService.getFloorplanEntitlement(placeId, place.siteId);
      
      // If not entitled (no active subscription), return empty array
      if (!entitlement.entitled) {
        return [];
      }
    }

    return this.prisma.placeFloorplan.findMany({
      where: { placeId },
      orderBy: { sortOrder: "asc" },
      include: {
        pins: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  /**
   * Get a single floorplan with pins
   */
  async findOne(floorplanId: string, userId: string | "public-read") {
    const floorplan = await this.prisma.placeFloorplan.findUnique({
      where: { id: floorplanId },
      include: {
        place: {
          select: { siteId: true },
        },
        pins: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!floorplan) {
      throw new NotFoundException(`Floorplan with id ${floorplanId} not found`);
    }

    // RBAC check only for authenticated users
    if (userId !== "public-read") {
      await this.rbacService.checkSiteAccessWithUser(userId, floorplan.place.siteId, ["siteadmin", "editor"]);
    }

    return floorplan;
  }

  /**
   * Create a new floorplan
   */
  async create(dto: CreateFloorplanDto, userId: string) {
    // Get place to check siteId and validate entitlement
    const place = await this.prisma.place.findUnique({
      where: { id: dto.placeId },
      select: { siteId: true },
    });

    if (!place) {
      throw new NotFoundException(`Place with id ${dto.placeId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, place.siteId, ["siteadmin", "editor"]);

    // Check entitlement
    const entitlement = await this.featureSubscriptionService.getFloorplanEntitlement(dto.placeId, place.siteId);

    if (!entitlement.entitled) {
      throw new BadRequestException("Floorplan feature is not available for this place. Please subscribe first.");
    }

    // Check limit
    if (entitlement.used >= entitlement.limit) {
      throw new BadRequestException(`Floorplan limit reached (${entitlement.used}/${entitlement.limit}).`);
    }

    // If isPrimary is true, unset other primary floorplans
    if (dto.isPrimary) {
      await this.prisma.placeFloorplan.updateMany({
        where: { placeId: dto.placeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Get max sortOrder
    const maxSortOrder = await this.prisma.placeFloorplan.findFirst({
      where: { placeId: dto.placeId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    return this.prisma.placeFloorplan.create({
      data: {
        placeId: dto.placeId,
        title: dto.title || "Floorplan",
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? (maxSortOrder?.sortOrder ?? 0) + 1,
        isPrimary: dto.isPrimary ?? false,
      },
      include: {
        pins: true,
      },
    });
  }

  /**
   * Update a floorplan
   */
  async update(floorplanId: string, dto: UpdateFloorplanDto, userId: string) {
    const floorplan = await this.prisma.placeFloorplan.findUnique({
      where: { id: floorplanId },
      include: {
        place: {
          select: { siteId: true },
        },
      },
    });

    if (!floorplan) {
      throw new NotFoundException(`Floorplan with id ${floorplanId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, floorplan.place.siteId, ["siteadmin", "editor"]);

    // If isPrimary is being set to true, unset other primary floorplans
    if (dto.isPrimary === true) {
      await this.prisma.placeFloorplan.updateMany({
        where: {
          placeId: floorplan.placeId,
          isPrimary: true,
          id: { not: floorplanId },
        },
        data: { isPrimary: false },
      });
    }

    return this.prisma.placeFloorplan.update({
      where: { id: floorplanId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      },
      include: {
        pins: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  /**
   * Delete a floorplan (cascade deletes pins)
   */
  async delete(floorplanId: string, userId: string) {
    const floorplan = await this.prisma.placeFloorplan.findUnique({
      where: { id: floorplanId },
      include: {
        place: {
          select: { siteId: true },
        },
      },
    });

    if (!floorplan) {
      throw new NotFoundException(`Floorplan with id ${floorplanId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, floorplan.place.siteId, ["siteadmin", "editor"]);

    return this.prisma.placeFloorplan.delete({
      where: { id: floorplanId },
    });
  }
}

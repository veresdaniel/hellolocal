// admin-floorplan-pin.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../auth/rbac.service";

export interface CreateFloorplanPinDto {
  floorplanId: string;
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
  label: string;
  sortOrder?: number;
}

export interface UpdateFloorplanPinDto {
  x?: number;
  y?: number;
  label?: string;
  sortOrder?: number;
}

@Injectable()
export class AdminFloorplanPinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService
  ) {}

  /**
   * Get all pins for a floorplan
   */
  async findAll(floorplanId: string, userId: string) {
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
    await this.rbacService.checkSiteAccessWithUser(userId, floorplan.place.siteId, [
      "siteadmin",
      "editor",
    ]);

    return this.prisma.floorplanPin.findMany({
      where: { floorplanId },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * Get a single pin
   */
  async findOne(pinId: string, userId: string) {
    const pin = await this.prisma.floorplanPin.findUnique({
      where: { id: pinId },
      include: {
        floorplan: {
          include: {
            place: {
              select: { siteId: true },
            },
          },
        },
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pin with id ${pinId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, pin.floorplan.place.siteId, [
      "siteadmin",
      "editor",
    ]);

    return pin;
  }

  /**
   * Create a new pin
   */
  async create(dto: CreateFloorplanPinDto, userId: string) {
    // Validate x, y are in range 0..1
    if (dto.x < 0 || dto.x > 1 || dto.y < 0 || dto.y > 1) {
      throw new BadRequestException("x and y must be between 0 and 1");
    }

    const floorplan = await this.prisma.placeFloorplan.findUnique({
      where: { id: dto.floorplanId },
      include: {
        place: {
          select: { siteId: true },
        },
      },
    });

    if (!floorplan) {
      throw new NotFoundException(`Floorplan with id ${dto.floorplanId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, floorplan.place.siteId, [
      "siteadmin",
      "editor",
    ]);

    // Get max sortOrder
    const maxSortOrder = await this.prisma.floorplanPin.findFirst({
      where: { floorplanId: dto.floorplanId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    return this.prisma.floorplanPin.create({
      data: {
        floorplanId: dto.floorplanId,
        x: dto.x,
        y: dto.y,
        label: dto.label || "",
        sortOrder: dto.sortOrder ?? (maxSortOrder?.sortOrder ?? 0) + 1,
      },
    });
  }

  /**
   * Update a pin
   */
  async update(pinId: string, dto: UpdateFloorplanPinDto, userId: string) {
    const pin = await this.prisma.floorplanPin.findUnique({
      where: { id: pinId },
      include: {
        floorplan: {
          include: {
            place: {
              select: { siteId: true },
            },
          },
        },
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pin with id ${pinId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, pin.floorplan.place.siteId, [
      "siteadmin",
      "editor",
    ]);

    // Validate x, y if provided
    if (dto.x !== undefined && (dto.x < 0 || dto.x > 1)) {
      throw new BadRequestException("x must be between 0 and 1");
    }
    if (dto.y !== undefined && (dto.y < 0 || dto.y > 1)) {
      throw new BadRequestException("y must be between 0 and 1");
    }

    return this.prisma.floorplanPin.update({
      where: { id: pinId },
      data: {
        ...(dto.x !== undefined && { x: dto.x }),
        ...(dto.y !== undefined && { y: dto.y }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * Delete a pin
   */
  async delete(pinId: string, userId: string) {
    const pin = await this.prisma.floorplanPin.findUnique({
      where: { id: pinId },
      include: {
        floorplan: {
          include: {
            place: {
              select: { siteId: true },
            },
          },
        },
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pin with id ${pinId} not found`);
    }

    // RBAC check
    await this.rbacService.checkSiteAccessWithUser(userId, pin.floorplan.place.siteId, [
      "siteadmin",
      "editor",
    ]);

    return this.prisma.floorplanPin.delete({
      where: { id: pinId },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang } from "@prisma/client";

export interface CreatePriceBandDto {
  tenantId: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

export interface UpdatePriceBandDto {
  translations?: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}

@Injectable()
export class AdminPriceBandService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.priceBand.findMany({
      where: { tenantId },
      include: {
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    const priceBand = await this.prisma.priceBand.findFirst({
      where: { id, tenantId },
      include: {
        translations: true,
      },
    });

    if (!priceBand) {
      throw new NotFoundException("Price band not found");
    }

    return priceBand;
  }

  async create(dto: CreatePriceBandDto) {
    return this.prisma.priceBand.create({
      data: {
        tenantId: dto.tenantId,
        isActive: dto.isActive ?? true,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
          })),
        },
      },
      include: {
        translations: true,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdatePriceBandDto) {
    const priceBand = await this.findOne(id, tenantId);

    const updateData: any = {};
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.priceBand.update({
      where: { id },
      data: updateData,
    });

    if (dto.translations) {
      for (const translation of dto.translations) {
        await this.prisma.priceBandTranslation.upsert({
          where: {
            priceBandId_lang: {
              priceBandId: id,
              lang: translation.lang,
            },
          },
          update: {
            name: translation.name,
            description: translation.description ?? null,
          },
          create: {
            priceBandId: id,
            lang: translation.lang,
            name: translation.name,
            description: translation.description ?? null,
          },
        });
      }
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const priceBand = await this.findOne(id, tenantId);

    // Check if price band is used by any places
    const placesCount = await this.prisma.place.count({
      where: { priceBandId: id },
    });

    if (placesCount > 0) {
      throw new BadRequestException(
        `Cannot delete price band: it is used by ${placesCount} place(s). Deactivate it instead.`
      );
    }

    await this.prisma.priceBand.delete({
      where: { id },
    });

    return { message: "Price band deleted successfully" };
  }
}


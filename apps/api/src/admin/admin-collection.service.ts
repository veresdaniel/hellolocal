import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Lang, Prisma } from "@prisma/client";

export interface CreateCollectionDto {
  slug: string;
  domain?: string | null;
  isActive?: boolean;
  isCrawlable?: boolean;
  order?: number;
  translations: Array<{
    lang: Lang;
    title: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}

export interface UpdateCollectionDto {
  slug?: string;
  domain?: string | null;
  isActive?: boolean;
  isCrawlable?: boolean;
  order?: number;
  translations?: Array<{
    lang: Lang;
    title: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}

export interface CreateCollectionItemDto {
  collectionId: string;
  siteId: string;
  order?: number;
  isHighlighted?: boolean;
  translations?: Array<{
    lang: Lang;
    titleOverride?: string | null;
    descriptionOverride?: string | null;
    imageOverride?: string | null;
  }>;
}

export interface UpdateCollectionItemDto {
  order?: number;
  isHighlighted?: boolean;
  translations?: Array<{
    lang: Lang;
    titleOverride?: string | null;
    descriptionOverride?: string | null;
    imageOverride?: string | null;
  }>;
}

@Injectable()
export class AdminCollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const collections = await this.prisma.collection.findMany({
        include: {
          translations: true,
          items: {
            include: {
              site: {
                select: {
                  id: true,
                  slug: true,
                  translations: {
                    select: {
                      id: true,
                      lang: true,
                      name: true,
                      shortDescription: true,
                      heroImage: true,
                    },
                  },
                },
              },
              translations: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });

      // Filter out any items with null sites (shouldn't happen with cascade, but just in case)
      type CollectionWithRelations = Prisma.CollectionGetPayload<{
        include: {
          translations: true;
          items: {
            include: {
              site: {
                select: {
                  id: true;
                  slug: true;
                  translations: {
                    select: {
                      id: true;
                      lang: true;
                      name: true;
                      shortDescription: true;
                      heroImage: true;
                    };
                  };
                };
              };
              translations: true;
            };
          };
        };
      }>;

      const sanitizedCollections = collections.map((collection: CollectionWithRelations) => ({
        ...collection,
        items: collection.items.filter((item) => item.site !== null),
        itemsCount: collection.items.filter((item) => item.site !== null).length,
      }));

      return sanitizedCollections;
    } catch (error) {
      console.error("Error in findAll collections:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      throw error;
    }
  }

  async findOne(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        translations: true,
        items: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: true,
              },
            },
            translations: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    return collection;
  }

  async create(dto: CreateCollectionDto) {
    // Validate slug uniqueness
    const existing = await this.prisma.collection.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Collection with slug "${dto.slug}" already exists`);
    }

    // Validate domain uniqueness if provided
    if (dto.domain) {
      const existingDomain = await this.prisma.collection.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new BadRequestException(`Collection with domain "${dto.domain}" already exists`);
      }
    }

    return this.prisma.collection.create({
      data: {
        slug: dto.slug,
        domain: dto.domain || null,
        isActive: dto.isActive ?? false,
        isCrawlable: dto.isCrawlable ?? true,
        order: dto.order ?? 0,
        translations: {
          create: dto.translations.map((t) => ({
            lang: t.lang,
            title: t.title,
            description: t.description || null,
            heroImage: t.heroImage || null,
            seoTitle: t.seoTitle || null,
            seoDescription: t.seoDescription || null,
            seoImage: t.seoImage || null,
            seoKeywords: t.seoKeywords || [],
          })),
        },
      },
      include: {
        translations: true,
        items: true,
      },
    });
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const collection = await this.findOne(id);

    // Validate slug uniqueness if changed
    if (dto.slug && dto.slug !== collection.slug) {
      const existing = await this.prisma.collection.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new BadRequestException(`Collection with slug "${dto.slug}" already exists`);
      }
    }

    // Validate domain uniqueness if changed
    if (dto.domain !== undefined && dto.domain !== collection.domain) {
      if (dto.domain) {
        const existingDomain = await this.prisma.collection.findUnique({
          where: { domain: dto.domain },
        });
        if (existingDomain) {
          throw new BadRequestException(`Collection with domain "${dto.domain}" already exists`);
        }
      }
    }

    // Update main fields
    const updateData: Prisma.CollectionUpdateInput = {};
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.domain !== undefined) updateData.domain = dto.domain || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isCrawlable !== undefined) updateData.isCrawlable = dto.isCrawlable;
    if (dto.order !== undefined) updateData.order = dto.order;

    // Update translations if provided
    if (dto.translations) {
      // Delete existing translations and create new ones
      await this.prisma.collectionTranslation.deleteMany({
        where: { collectionId: id },
      });

      updateData.translations = {
        create: dto.translations.map((t) => ({
          lang: t.lang,
          title: t.title,
          description: t.description || null,
          heroImage: t.heroImage || null,
          seoTitle: t.seoTitle || null,
          seoDescription: t.seoDescription || null,
          seoImage: t.seoImage || null,
          seoKeywords: t.seoKeywords || [],
        })),
      };
    }

    return this.prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        translations: true,
        items: {
          include: {
            site: {
              select: {
                id: true,
                slug: true,
                translations: true,
              },
            },
            translations: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async delete(id: string) {
    const collection = await this.findOne(id);
    return this.prisma.collection.delete({
      where: { id },
    });
  }

  // Collection Items

  async addItem(dto: CreateCollectionItemDto) {
    // Verify collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: dto.collectionId },
    });
    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException("Site not found");
    }

    return this.prisma.collectionItem.create({
      data: {
        collectionId: dto.collectionId,
        siteId: dto.siteId,
        order: dto.order ?? 0,
        isHighlighted: dto.isHighlighted ?? false,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                lang: t.lang,
                titleOverride: t.titleOverride || null,
                descriptionOverride: t.descriptionOverride || null,
                imageOverride: t.imageOverride || null,
              })),
            }
          : undefined,
      },
      include: {
        site: {
          select: {
            id: true,
            slug: true,
            translations: true,
          },
        },
        translations: true,
      },
    });
  }

  async updateItem(itemId: string, dto: UpdateCollectionItemDto) {
    const item = await this.prisma.collectionItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException("Collection item not found");
    }

    const updateData: Prisma.CollectionItemUpdateInput = {};
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isHighlighted !== undefined) updateData.isHighlighted = dto.isHighlighted;

    // Update translations if provided
    if (dto.translations) {
      // Delete existing translations and create new ones
      await this.prisma.collectionItemTranslation.deleteMany({
        where: { collectionItemId: itemId },
      });

      updateData.translations = {
        create: dto.translations.map((t) => ({
          lang: t.lang,
          titleOverride: t.titleOverride || null,
          descriptionOverride: t.descriptionOverride || null,
          imageOverride: t.imageOverride || null,
        })),
      };
    }

    return this.prisma.collectionItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            slug: true,
            translations: true,
          },
        },
        translations: true,
      },
    });
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.collectionItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException("Collection item not found");
    }

    return this.prisma.collectionItem.delete({
      where: { id: itemId },
    });
  }

  async reorderItems(collectionId: string, itemIds: string[]) {
    // Verify collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { items: true },
    });
    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    // Verify all items belong to this collection
    const itemIdsSet = new Set(itemIds);
    const collectionItemIds = new Set(collection.items.map((item) => item.id));
    for (const itemId of itemIds) {
      if (!collectionItemIds.has(itemId)) {
        throw new BadRequestException(`Item ${itemId} does not belong to collection ${collectionId}`);
      }
    }

    // Update order for each item
    await Promise.all(
      itemIds.map((itemId, index) =>
        this.prisma.collectionItem.update({
          where: { id: itemId },
          data: { order: index },
        })
      )
    );

    return this.findOne(collectionId);
  }

  async updateItems(collectionId: string, items: Array<{
    id?: string;
    siteId: string;
    order: number;
    isHighlighted?: boolean;
    translations?: Array<{
      lang: Lang;
      titleOverride?: string | null;
      descriptionOverride?: string | null;
      imageOverride?: string | null;
    }>;
  }>) {
    // Verify collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { items: true },
    });
    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    const existingItems = collection.items;
    const existingItemIds = new Set(existingItems.map(item => item.id));
    const newItemIds = new Set(items.map(item => item.id).filter((id): id is string => !!id && !id.startsWith('temp-')));

    // Delete items that are not in the new array
    const itemsToDelete = existingItems.filter(item => !newItemIds.has(item.id));
    if (itemsToDelete.length > 0) {
      await this.prisma.collectionItem.deleteMany({
        where: {
          id: { in: itemsToDelete.map(item => item.id) },
        },
      });
    }

    // Update or create items
    await Promise.all(
      items.map(async (itemData, index) => {
        const isNewItem = !itemData.id || itemData.id.startsWith('temp-') || !existingItemIds.has(itemData.id);
        
        if (isNewItem) {
          // Create new item
          await this.prisma.collectionItem.create({
            data: {
              collectionId,
              siteId: itemData.siteId,
              order: index,
              isHighlighted: itemData.isHighlighted || false,
              translations: itemData.translations
                ? {
                    create: itemData.translations.map((t) => ({
                      lang: t.lang,
                      titleOverride: t.titleOverride || null,
                      descriptionOverride: t.descriptionOverride || null,
                      imageOverride: t.imageOverride || null,
                    })),
                  }
                : undefined,
            },
          });
        } else {
          // Update existing item
          await this.prisma.collectionItem.update({
            where: { id: itemData.id },
            data: {
              order: index,
              isHighlighted: itemData.isHighlighted !== undefined ? itemData.isHighlighted : undefined,
              translations: itemData.translations
                ? {
                    deleteMany: {},
                    create: itemData.translations.map((t) => ({
                      lang: t.lang,
                      titleOverride: t.titleOverride || null,
                      descriptionOverride: t.descriptionOverride || null,
                      imageOverride: t.imageOverride || null,
                    })),
                  }
                : undefined,
            },
          });
        }
      })
    );

    return this.findOne(collectionId);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
  NotFoundException,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole, Lang } from "@prisma/client";
import { AdminCategoryService, CreateCategoryDto, UpdateCategoryDto } from "./admin-category.service";
import { AdminTagService, CreateTagDto, UpdateTagDto } from "./admin-tag.service";
import { AdminPriceBandService, CreatePriceBandDto, UpdatePriceBandDto } from "./admin-priceband.service";
import { AdminUsersService, UpdateUserRoleDto, UpdateUserDto, CreateUserDto } from "./admin-users.service";
import { AdminTownService, CreateTownDto, UpdateTownDto } from "./admin-town.service";
import { AdminPlaceService, CreatePlaceDto, UpdatePlaceDto } from "./admin-place.service";
import { PlaceUpsellService } from "../entitlements/place-upsell.service";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { AdminLegalService, CreateLegalPageDto, UpdateLegalPageDto } from "./admin-legal.service";
import { AdminStaticPageService, CreateStaticPageDto, UpdateStaticPageDto } from "./admin-static-page.service";
import { AdminSiteService, CreateSiteDto, UpdateSiteDto } from "./admin-site.service";
import { AdminAppSettingsService, AppSettingDto } from "./admin-app-settings.service";
import { AdminEventService, CreateEventDto, UpdateEventDto } from "./admin-event.service";
import { AdminEventLogService, EventLogFilterDto } from "../event-log/admin-eventlog.service";
import { AdminBrandService, CreateBrandDto, UpdateBrandDto } from "./admin-brand.service";
import { AdminSiteInstanceService, CreateSiteInstanceDto, UpdateSiteInstanceDto } from "./admin-site-instance.service";
import { AdminSiteMembershipService, CreateSiteMembershipDto, UpdateSiteMembershipDto } from "./admin-site-membership.service";
import { AdminPlaceMembershipService, CreatePlaceMembershipDto, UpdatePlaceMembershipDto } from "./admin-place-membership.service";
import { AdminSubscriptionService, UpdateSubscriptionDto } from "./admin-subscription.service";
import { AdminGalleryService, CreateGalleryDto, UpdateGalleryDto } from "./admin-gallery.service";
import { AdminPriceListService, UpdatePriceListDto } from "./admin-price-list.service";
import { AdminCollectionService, CreateCollectionDto, UpdateCollectionDto, CreateCollectionItemDto, UpdateCollectionItemDto } from "./admin-collection.service";
import { RbacService } from "../auth/rbac.service";
import { TwoFactorService } from "../two-factor/two-factor.service";
import { PrismaService } from "../prisma/prisma.service";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import {
  generateCreateDescription,
  generateUpdateDescription,
  generateDeleteDescription,
} from "./event-log.helper";

/**
 * Admin controller for CRUD operations on all entities.
 * All endpoints require JWT authentication and appropriate role.
 * 
 * Currently, all endpoints are accessible to admin and editor roles.
 * In the future, more granular permissions can be added.
 */
@Controller("/api/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: AdminCategoryService,
    private readonly tagService: AdminTagService,
    private readonly priceBandService: AdminPriceBandService,
    private readonly usersService: AdminUsersService,
    private readonly townService: AdminTownService,
    private readonly placeService: AdminPlaceService,
    private readonly legalService: AdminLegalService,
    private readonly staticPageService: AdminStaticPageService,
    private readonly siteService: AdminSiteService,
    private readonly appSettingsService: AdminAppSettingsService,
    private readonly eventService: AdminEventService,
    private readonly eventLogService: AdminEventLogService,
    private readonly brandService: AdminBrandService,
    private readonly siteInstanceService: AdminSiteInstanceService,
    private readonly siteMembershipService: AdminSiteMembershipService,
    private readonly placeMembershipService: AdminPlaceMembershipService,
    private readonly subscriptionService: AdminSubscriptionService,
    private readonly galleryService: AdminGalleryService,
    private readonly priceListService: AdminPriceListService,
    private readonly collectionService: AdminCollectionService,
    private readonly placeUpsellService: PlaceUpsellService,
    private readonly entitlementsService: EntitlementsService,
    private readonly rbacService: RbacService,
    private readonly twoFactorService: TwoFactorService,
    private readonly platformSettingsService: PlatformSettingsService
  ) {}

  // ==================== Categories ====================

  @Get("/categories")
  async getCategories(
    @CurrentUser() user: { siteIds: string[] },
    @Query("siteId") siteIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    // Use siteId from query if provided, otherwise use first site from user
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    // Verify user has access to this site
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.categoryService.findAll(siteId, pageNum, limitNum);
  }

  @Get("/categories/:id")
  async getCategory(@Param("id") id: string, @CurrentUser() user: { siteIds: string[] }) {
    const siteId = user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    return this.categoryService.findOne(id, siteId);
  }

  @Post("/categories")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    // Use siteId from user if not provided
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.categoryService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "category",
      result.translations,
      { isActive: result.isActive }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "category",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log create category:", err));
    
    return result;
  }

  @Put("/categories/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldCategory = await this.categoryService.findOne(id, siteId);
    const result = await this.categoryService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "category",
      result.translations,
      {
        translations: oldCategory.translations,
        isActive: oldCategory.isActive,
        color: oldCategory.color,
        order: oldCategory.order,
      },
      {
        translations: result.translations,
        isActive: result.isActive,
        color: result.color,
        order: result.order,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "category",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log update category:", err));
    
    return result;
  }

  @Delete("/categories/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteCategory(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get category data before deletion for logging
    const category = await this.categoryService.findOne(id, siteId);
    const result = await this.categoryService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "category",
      category.translations
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "category",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log delete category:", err));
    
    return result;
  }

  @Put("/categories/reorder")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async reorderCategories(
    @Body() body: { siteId: string; updates: Array<{ id: string; parentId: string | null; order: number }> },
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = body.siteId || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.categoryService.reorder(siteId, body.updates);
  }

  // ==================== Tags ====================

  @Get("/tags")
  async getTags(
    @Query("siteId") siteIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.tagService.findAll(siteId, page, limit);
  }

  @Get("/tags/:id")
  async getTag(@Param("id") id: string, @CurrentUser() user: { siteIds: string[] }) {
    const siteId = user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    return this.tagService.findOne(id, siteId);
  }

  @Post("/tags")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createTag(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.tagService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "tag",
      result.translations,
      { isActive: result.isActive }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "tag",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log create tag:", err));
    
    return result;
  }

  @Put("/tags/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateTag(
    @Param("id") id: string,
    @Body() dto: UpdateTagDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldTag = await this.tagService.findOne(id, siteId);
    const result = await this.tagService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "tag",
      result.translations,
      {
        translations: oldTag.translations,
        isActive: oldTag.isActive,
      },
      {
        translations: result.translations,
        isActive: result.isActive,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "tag",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log update tag:", err));
    
    return result;
  }

  @Delete("/tags/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteTag(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get tag data before deletion for logging
    const tag = await this.tagService.findOne(id, siteId);
    const result = await this.tagService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "tag",
      tag.translations
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "tag",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log delete tag:", err));
    
    return result;
  }

  // ==================== Price Bands ====================

  @Get("/price-bands")
  async getPriceBands(
    @Query("siteId") siteIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.priceBandService.findAll(siteId, page, limit);
  }

  @Get("/price-bands/:id")
  async getPriceBand(@Param("id") id: string, @CurrentUser() user: { siteIds: string[] }) {
    const siteId = user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    return this.priceBandService.findOne(id, siteId);
  }

  @Post("/price-bands")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createPriceBand(
    @Body() dto: CreatePriceBandDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.priceBandService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "price band",
      result.translations,
      { isActive: result.isActive }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "priceBand",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/price-bands/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updatePriceBand(
    @Param("id") id: string,
    @Body() dto: UpdatePriceBandDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldPriceBand = await this.priceBandService.findOne(id, siteId);
    const result = await this.priceBandService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "price band",
      result.translations,
      {
        translations: oldPriceBand.translations,
        isActive: oldPriceBand.isActive,
      },
      {
        translations: result.translations,
        isActive: result.isActive,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "priceBand",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/price-bands/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deletePriceBand(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get price band data before deletion for logging
    const priceBand = await this.priceBandService.findOne(id, siteId);
    const result = await this.priceBandService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "price band",
      priceBand.translations
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "priceBand",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Towns ====================

  @Get("/towns")
  async getTowns(
    @Query("siteId") siteIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.townService.findAll(siteId, page, limit);
  }

  @Get("/towns/:id")
  async getTown(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.townService.findOne(id, siteId);
  }

  @Post("/towns")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createTown(
    @Body() dto: CreateTownDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.townService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "town",
      result.translations
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "town",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/towns/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateTown(
    @Param("id") id: string,
    @Body() dto: UpdateTownDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldTown = await this.townService.findOne(id, siteId);
    const result = await this.townService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "town",
      result.translations,
      {
        translations: oldTown.translations,
      },
      {
        translations: result.translations,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "town",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/towns/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteTown(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get town data before deletion for logging
    const town = await this.townService.findOne(id, siteId);
    const result = await this.townService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "town",
      town.translations
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "town",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Places ====================

  @Get("/places")
  async getPlaces(
    @Query("siteId") siteIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.placeService.findAll(siteId, page, limit);
  }

  @Get("/places/:id")
  async getPlace(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.placeService.findOne(id, siteId);
  }

  @Get("/places/:id/upsell-state")
  async getPlaceUpsellState(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    
    const place = await this.placeService.findOne(id, siteId);
    // Extract all images from galleries and count them
    const galleryImages = (place.galleries || [])
      .flatMap((gallery: any) => {
        try {
          const images = typeof gallery.images === 'string' 
            ? JSON.parse(gallery.images) 
            : gallery.images;
          return Array.isArray(images) ? images : [];
        } catch {
          return [];
        }
      });
    const currentImageCount = galleryImages.length + (place.heroImage ? 1 : 0);
    
    return this.placeUpsellService.getPlaceUpsellState(
      siteId,
      id,
      place.plan,
      place.isFeatured || false,
      currentImageCount,
      place.galleryLimitOverride
    );
  }

  @Post("/places")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createPlace(
    @Body() dto: CreatePlaceDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.placeService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "place",
      result.translations,
      { isActive: result.isActive, plan: result.plan, isFeatured: result.isFeatured }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "place",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/places/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updatePlace(
    @Param("id") id: string,
    @Body() dto: UpdatePlaceDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldPlace = await this.placeService.findOne(id, siteId);
    const result = await this.placeService.update(id, siteId, dto, user.id);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "place",
      result.translations,
      {
        translations: oldPlace.translations,
        isActive: oldPlace.isActive,
        plan: oldPlace.plan,
        isFeatured: oldPlace.isFeatured,
        categoryId: oldPlace.categoryId,
        townId: oldPlace.townId,
        priceBandId: oldPlace.priceBandId,
      },
      {
        translations: result.translations,
        isActive: result.isActive,
        plan: result.plan,
        isFeatured: result.isFeatured,
        categoryId: result.categoryId,
        townId: result.townId,
        priceBandId: result.priceBandId,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "place",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/places/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deletePlace(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get place data before deletion for logging
    const place = await this.placeService.findOne(id, siteId);
    const result = await this.placeService.remove(id, siteId, user.id);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "place",
      place.translations
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "place",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Place Price List ====================

  @Get("/places/:placeId/pricelist")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async getPlacePriceList(
    @Param("placeId") placeId: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.priceListService.getPriceList(placeId, siteId, user.id);
  }

  @Put("/places/:placeId/pricelist")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updatePlacePriceList(
    @Param("placeId") placeId: string,
    @Query("siteId") siteIdParam: string | undefined,
    @Body() dto: UpdatePriceListDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.priceListService.upsertPriceList(placeId, siteId, dto, user.id);
    
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "placePriceList",
      entityId: placeId,
      description: `Updated price list for place`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Legal Pages ====================

  @Get("/legal-pages")
  async getLegalPages(
    @CurrentUser() user: { siteIds: string[] },
    @Query("siteId") siteIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.legalService.findAll(siteId, pageNum, limitNum);
  }

  @Get("/legal-pages/:id")
  async getLegalPage(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.legalService.findOne(id, siteId);
  }

  @Get("/legal-pages/key/:key")
  async getLegalPageByKey(
    @Param("key") key: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.legalService.findByKey(key, siteId);
  }

  @Post("/legal-pages")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createLegalPage(
    @Body() dto: CreateLegalPageDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.legalService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "legal page",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      { pageKey: result.key }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "legalPage",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/legal-pages/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateLegalPage(
    @Param("id") id: string,
    @Body() dto: UpdateLegalPageDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldLegalPage = await this.legalService.findOne(id, siteId);
    const result = await this.legalService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "legal page",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      {
        translations: oldLegalPage.translations.map(t => ({ lang: t.lang, name: t.title })),
      },
      {
        translations: result.translations,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "legalPage",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/legal-pages/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteLegalPage(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get legal page data before deletion for logging
    const legalPage = await this.legalService.findOne(id, siteId);
    const result = await this.legalService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "legal page",
      legalPage.translations.map(t => ({ lang: t.lang, name: t.title }))
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "legalPage",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Static Pages ====================

  @Get("/static-pages")
  async getStaticPages(
    @CurrentUser() user: { siteIds: string[] },
    @Query("siteId") siteIdParam?: string,
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.staticPageService.findAll(siteId, category as any, pageNum, limitNum);
  }

  @Get("/static-pages/:id")
  async getStaticPage(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    return this.staticPageService.findOne(id, siteId);
  }

  @Post("/static-pages")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async createStaticPage(
    @Body() dto: CreateStaticPageDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new Error("User does not have access to this site");
    }
    const result = await this.staticPageService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "static page",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      { category: result.category, isActive: result.isActive }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "staticPage",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/static-pages/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateStaticPage(
    @Param("id") id: string,
    @Body() dto: UpdateStaticPageDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldStaticPage = await this.staticPageService.findOne(id, siteId);
    const result = await this.staticPageService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "static page",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      {
        translations: oldStaticPage.translations.map(t => ({ lang: t.lang, name: t.title })),
        category: oldStaticPage.category,
        isActive: oldStaticPage.isActive,
      },
      {
        translations: result.translations.map(t => ({ lang: t.lang, name: t.title })),
        category: result.category,
        isActive: result.isActive,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "staticPage",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/static-pages/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteStaticPage(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get static page data before deletion for logging
    const staticPage = await this.staticPageService.findOne(id, siteId);
    const result = await this.staticPageService.remove(id, siteId);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "static page",
      staticPage.translations.map(t => ({ lang: t.lang, name: t.title }))
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "staticPage",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Users ====================

  @Get("/users")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getUsers(
    @Query("siteId") siteId?: string,
    @CurrentUser() user?: { role: UserRole; siteIds: string[] }
  ) {
    // Superadmin and admin can see all users, others only see users from their sites
    const filterSiteId = (user?.role === UserRole.superadmin || user?.role === UserRole.admin) ? siteId : user?.siteIds[0];
    return this.usersService.findAll(filterSiteId);
  }

  @Get("/users/me")
  async getCurrentUser(@CurrentUser() user: { id: string }) {
    return this.usersService.getCurrentUser(user.id);
  }

  @Get("/users/:id")
  @Roles(UserRole.admin)
  async getUser(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Put("/users/:id/role")
  @Roles(UserRole.superadmin)
  async updateUserRole(
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.usersService.updateRole(id, dto.role, user.role);
  }

  @Post("/users")
  @Roles(UserRole.superadmin)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    const result = await this.usersService.create(dto, user.role);
    
    // Log to first site of the created user
    const siteId = dto.siteIds?.[0] || user.siteIds[0];
    if (siteId) {
      // Log the action with detailed description
      const description = generateCreateDescription(
        "user",
        null,
        {
          username: result.username,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
        }
      );
      await this.eventLogService.create({
        siteId,
        userId: user.id,
        action: "create",
        entityType: "user",
        entityId: result.id,
        description,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  @Put("/users/:id")
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Users can only update themselves, unless they are superadmin or admin
    if (user.id !== id && user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      throw new ForbiddenException("You can only update your own profile");
    }
    // Get old data for comparison
    const oldUser = await this.usersService.findOne(id);
    const result = await this.usersService.updateUserWithSites(id, dto, user.role);
    
    const siteId = user.siteIds[0];
    if (siteId) {
      // Log the action with detailed description
      const description = generateUpdateDescription(
        "user",
        null,
        {
          username: oldUser.username,
          email: oldUser.email,
          firstName: oldUser.firstName,
          lastName: oldUser.lastName,
          role: oldUser.role,
          isActive: oldUser.isActive,
        },
        {
          username: result.username,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
          isActive: result.isActive,
        }
      );
      await this.eventLogService.create({
        siteId,
        userId: user.id,
        action: "update",
        entityType: "user",
        entityId: id,
        description,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  @Delete("/users/:id")
  @Roles(UserRole.superadmin)
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Get user data before deletion for logging
    const userToDelete = await this.usersService.findOne(id);
    const result = await this.usersService.remove(id, user.role);
    
    const siteId = user.siteIds[0];
    if (siteId) {
      // Log the action with detailed description
      const description = generateDeleteDescription(
        "user",
        null,
        {
          username: userToDelete.username,
          email: userToDelete.email,
          firstName: userToDelete.firstName,
          lastName: userToDelete.lastName,
        }
      );
      await this.eventLogService.create({
        siteId,
        userId: user.id,
        action: "delete",
        entityType: "user",
        entityId: id,
        description,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  @Post("/users/:id/two-factor/disable")
  @Roles(UserRole.superadmin, UserRole.admin)
  async disableTwoFactorForUser(@Param("id") id: string) {
    await this.twoFactorService.disableTwoFactor(id);
    return { message: "2FA has been disabled for this user." };
  }

  // ==================== Sites ====================

  @Get("/sites")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSites() {
    return this.siteService.findAll();
  }

  @Get("/sites/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getSite(@Param("id") id: string, @CurrentUser() user: { siteIds: string[] }) {
    // Superadmin and admin can access any site
    // Other users can only access their assigned sites
    if (user.siteIds && !user.siteIds.includes(id)) {
      throw new ForbiddenException("You do not have access to this site");
    }
    return this.siteService.findOne(id);
  }

  @Post("/sites")
  @Roles(UserRole.superadmin)
  async createSite(
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const result = await this.siteService.create(dto);
    
    // TypeScript null check - create() should never return null, but we check for safety
    if (!result) {
      throw new Error("Site creation failed: result is null");
    }
    
    // Log to the first available site (or the newly created one)
    const siteId = result.id;
    // Log the action with detailed description
    const description = generateCreateDescription(
      "site",
      result.translations,
      { isActive: result.isActive, plan: result.plan }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "create",
      entityType: "site",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/sites/:id")
  @Roles(UserRole.superadmin)
  async updateSite(
    @Param("id") id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    // Get old data for comparison
    const oldSite = await this.siteService.findOne(id);
    const result = await this.siteService.update(id, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "site",
      result.translations,
      {
        translations: oldSite.translations,
        isActive: oldSite.isActive,
        plan: oldSite.plan,
      },
      {
        translations: result.translations,
        isActive: result.isActive,
        plan: result.plan,
      }
    );
    await this.eventLogService.create({
      siteId: id,
      userId: user.id,
      action: "update",
      entityType: "site",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/sites/:id")
  @Roles(UserRole.superadmin)
  async deleteSite(
    @Param("id") id: string,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    // Get site data before deletion for logging
    const siteToDelete = await this.siteService.findOne(id);
    const result = await this.siteService.remove(id);
    
    // Log to first available site since we're deleting one
    const siteId = user.siteIds[0];
    if (siteId) {
      // Log the action with detailed description
      const description = generateDeleteDescription(
        "site",
        siteToDelete.translations
      );
      await this.eventLogService.create({
        siteId,
        userId: user.id,
        action: "delete",
        entityType: "site",
        entityId: id,
        description,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  // ==================== Events ====================

  @Get("/events")
  async getEvents(
    @CurrentUser() user: { siteIds: string[] },
    @Query("siteId") siteIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new ForbiddenException("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.eventService.findAll(siteId, pageNum, limitNum);
  }

  @Get("/events/:id")
  async getEvent(@Param("id") id: string, @CurrentUser() user: { siteIds: string[] }) {
    const siteId = user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    return this.eventService.findOne(id, siteId);
  }

  @Post("/events")
  async createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: { id: string; siteIds: string[]; role: UserRole }
  ) {
    if (!dto.siteId) {
      dto.siteId = user.siteIds[0];
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }

    // RBAC: Check if user can create event for this place
    await this.rbacService.assertCanCreateEventForPlace(
      user.id,
      dto.siteId,
      dto.placeId || null
    );

    // Set createdByUserId for audit trail
    dto.createdByUserId = user.id;
    const result = await this.eventService.create(dto);
    
    // Log the action with detailed description
    const description = generateCreateDescription(
      "event",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      { isActive: result.isActive }
    );
    await this.eventLogService.create({
      siteId: dto.siteId,
      userId: user.id,
      action: "create",
      entityType: "event",
      entityId: result.id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/events/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async updateEvent(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get old data for comparison
    const oldEvent = await this.eventService.findOne(id, siteId);
    const result = await this.eventService.update(id, siteId, dto);
    
    // Log the action with detailed description
    const description = generateUpdateDescription(
      "event",
      result.translations.map(t => ({ lang: t.lang, name: t.title })),
      {
        translations: oldEvent.translations.map(t => ({ lang: t.lang, name: t.title })),
        isActive: oldEvent.isActive,
        placeId: oldEvent.placeId,
        startDate: oldEvent.startDate,
        endDate: oldEvent.endDate,
      },
      {
        translations: result.translations.map(t => ({ lang: t.lang, name: t.title })),
        isActive: result.isActive,
        placeId: result.placeId,
        startDate: result.startDate,
        endDate: result.endDate,
      }
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "update",
      entityType: "event",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/events/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async deleteEvent(
    @Param("id") id: string,
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new Error("User does not have access to this site");
    }
    // Get event data before deletion for logging
    const event = await this.eventService.findOne(id, siteId);
    const result = await this.eventService.remove(id, siteId, user.id);
    
    // Log the action with detailed description
    const description = generateDeleteDescription(
      "event",
      event.translations.map(t => ({ lang: t.lang, name: t.title }))
    );
    await this.eventLogService.create({
      siteId,
      userId: user.id,
      action: "delete",
      entityType: "event",
      entityId: id,
      description,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== App Settings ====================

  // Specific routes must come before parameterized routes
  @Get("/app-settings/default-language")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getDefaultLanguage() {
    const lang = await this.appSettingsService.getDefaultLanguage();
    return { defaultLanguage: lang };
  }

  @Put("/app-settings/default-language")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setDefaultLanguage(@Body() dto: { language: string }) {
    if (dto.language !== "hu" && dto.language !== "en" && dto.language !== "de") {
      throw new ForbiddenException("Invalid language. Use hu, en, or de.");
    }
    return this.appSettingsService.setDefaultLanguage(dto.language as Lang);
  }

  @Get("/app-settings/global-crawlability")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getGlobalCrawlability() {
    const isCrawlable = await this.appSettingsService.getGlobalCrawlability();
    return { isCrawlable };
  }

  @Put("/app-settings/global-crawlability")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setGlobalCrawlability(@Body() dto: { isCrawlable: boolean }) {
    return this.appSettingsService.setGlobalCrawlability(dto.isCrawlable);
  }

  @Get("/app-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getAppSettings() {
    return this.appSettingsService.findAll();
  }


  @Get("/app-settings/:key")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getAppSetting(@Param("key") key: string) {
    return this.appSettingsService.findOne(key);
  }

  @Post("/app-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async createAppSetting(@Body() dto: AppSettingDto) {
    return this.appSettingsService.upsert(dto.key, dto);
  }

  @Put("/app-settings/:key")
  @Roles(UserRole.superadmin, UserRole.admin)
  async updateAppSetting(@Param("key") key: string, @Body() dto: Omit<AppSettingDto, "key">) {
    return this.appSettingsService.upsert(key, dto);
  }

  @Delete("/app-settings/:key")
  @Roles(UserRole.superadmin)
  async deleteAppSetting(@Param("key") key: string) {
    return this.appSettingsService.delete(key);
  }

  // ==================== Event Logs ====================

  @Get("/event-logs")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getEventLogs(
    @Query() filters: EventLogFilterDto,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    return this.eventLogService.findAll(user.role, user.siteIds, normalizedFilters);
  }

  @Get("/event-logs/filter-options")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getEventLogFilterOptions(@CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }) {
    return this.eventLogService.getFilterOptions(user.role, user.siteIds);
  }

  @Get("/event-logs/export")
  @Roles(UserRole.superadmin, UserRole.admin)
  async exportEventLogs(
    @Query() filters: EventLogFilterDto,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] },
    @Res() res: Response
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    const csv = await this.eventLogService.exportToCsv(user.role, user.siteIds, normalizedFilters);
    
    const filename = `event-logs-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Delete("/event-logs")
  @Roles(UserRole.superadmin)
  async deleteEventLogs(
    @Query() filters: EventLogFilterDto,
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    return this.eventLogService.delete(user.role, user.siteIds, normalizedFilters);
  }

  @Post("/maintenance/generate-missing-slugs")
  @Roles(UserRole.superadmin)
  async generateMissingSlugs(@Query("siteId") siteIdParam: string | undefined, @CurrentUser() user: { siteIds: string[] }) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new ForbiddenException("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }

    const result = await this.placeService.generateMissingSlugs(siteId);
    return result;
  }

  // ==================== Brands ====================

  @Get("/brands")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getBrands() {
    try {
      return await this.brandService.findAll();
    } catch (error) {
      throw error;
    }
  }

  @Get("/brands/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getBrand(@Param("id") id: string) {
    try {
      return await this.brandService.findOne(id);
    } catch (error) {
      throw error;
    }
  }

  @Post("/brands")
  @Roles(UserRole.superadmin, UserRole.admin)
  async createBrand(@Body() dto: CreateBrandDto) {
    try {
      return await this.brandService.create(dto);
    } catch (error) {
      throw error;
    }
  }

  @Put("/brands/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async updateBrand(@Param("id") id: string, @Body() dto: UpdateBrandDto) {
    try {
      return await this.brandService.update(id, dto);
    } catch (error) {
      throw error;
    }
  }

  @Delete("/brands/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async deleteBrand(@Param("id") id: string) {
    try {
      return await this.brandService.delete(id);
    } catch (error) {
      throw error;
    }
  }

  // ==================== Site Instances ====================

  @Get("/site-instances")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteInstances(
    @Query("siteId") siteId?: string,
    @CurrentUser() user?: { siteIds: string[] }
  ) {
    // If siteId not provided and user has siteIds, use first site
    const resolvedSiteId = siteId || (user?.siteIds?.[0]);
    return this.siteInstanceService.findAll(resolvedSiteId);
  }

  @Get("/site-instances/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteInstance(@Param("id") id: string) {
    return this.siteInstanceService.findOne(id);
  }

  @Post("/site-instances")
  @Roles(UserRole.superadmin, UserRole.admin)
  async createSiteInstance(@Body() dto: CreateSiteInstanceDto) {
    return this.siteInstanceService.create(dto);
  }

  @Put("/site-instances/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async updateSiteInstance(@Param("id") id: string, @Body() dto: UpdateSiteInstanceDto) {
    return this.siteInstanceService.update(id, dto);
  }

  @Delete("/site-instances/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async deleteSiteInstance(@Param("id") id: string) {
    return this.siteInstanceService.delete(id);
  }

  // ==================== Site Memberships ====================

  @Get("/site-memberships")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteMemberships(
    @Query("siteId") siteId?: string,
    @Query("userId") userId?: string
  ) {
    return this.siteMembershipService.findAll(siteId, userId);
  }

  @Get("/site-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteMembership(@Param("id") id: string) {
    return this.siteMembershipService.findOne(id);
  }

  @Post("/site-memberships")
  @Roles(UserRole.superadmin, UserRole.admin)
  async createSiteMembership(@Body() dto: CreateSiteMembershipDto) {
    return this.siteMembershipService.create(dto);
  }

  @Put("/site-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async updateSiteMembership(@Param("id") id: string, @Body() dto: UpdateSiteMembershipDto) {
    return this.siteMembershipService.update(id, dto);
  }

  @Delete("/site-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async deleteSiteMembership(@Param("id") id: string) {
    return this.siteMembershipService.delete(id);
  }

  // ==================== Place Memberships ====================

  @Get("/place-memberships")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async getPlaceMemberships(
    @Query("placeId") placeId?: string,
    @Query("userId") userId?: string,
    @CurrentUser() user?: { id: string; siteIds: string[] }
  ) {
    // If userId not provided, use current user's ID
    const resolvedUserId = userId || user?.id;
    return this.placeMembershipService.findAll(placeId, resolvedUserId);
  }

  @Get("/place-memberships/my-places")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async getMyPlaces(
    @Query("siteId") siteId?: string,
    @CurrentUser() user?: { id: string; siteIds: string[] }
  ) {
    if (!user?.id) {
      throw new ForbiddenException("User ID is required");
    }
    return this.placeMembershipService.getMyPlaces(user.id, siteId);
  }

  @Get("/place-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async getPlaceMembership(@Param("id") id: string) {
    return this.placeMembershipService.findOne(id);
  }

  @Post("/place-memberships")
  @Roles(UserRole.superadmin, UserRole.admin)
  async createPlaceMembership(
    @Body() dto: CreatePlaceMembershipDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.placeMembershipService.create(dto, user.id);
  }

  @Put("/place-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async updatePlaceMembership(
    @Param("id") id: string,
    @Body() dto: UpdatePlaceMembershipDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.placeMembershipService.update(id, dto, user.id);
  }

  @Delete("/place-memberships/:id")
  @Roles(UserRole.superadmin, UserRole.admin)
  async deletePlaceMembership(
    @Param("id") id: string,
    @CurrentUser() user: { id: string }
  ) {
    return this.placeMembershipService.delete(id, user.id);
  }

  // ==================== Subscriptions ====================

  @Get("/subscriptions")
  @Roles(UserRole.superadmin)
  async getSubscriptions(
    @Query("scope") scope?: "site" | "place" | "all",
    @Query("status") status?: string,
    @Query("plan") plan?: string,
    @Query("q") q?: string,
    @Query("expiresWithinDays") expiresWithinDays?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string
  ) {
    return this.subscriptionService.findAll({
      scope: scope as "site" | "place" | "all" | undefined,
      status: status as any,
      plan: plan as any,
      q,
      expiresWithinDays: expiresWithinDays ? parseInt(expiresWithinDays, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get("/subscriptions/expiring")
  @Roles(UserRole.superadmin)
  async getExpiringSubscriptions(
    @Query("scope") scope?: "site" | "place" | "all",
    @Query("withinDays") withinDays?: string
  ) {
    return this.subscriptionService.getExpiring({
      scope: scope as "site" | "place" | "all" | undefined,
      withinDays: withinDays ? parseInt(withinDays, 10) : undefined,
    });
  }

  @Get("/subscriptions/summary")
  @Roles(UserRole.superadmin)
  async getSubscriptionSummary(
    @Query("scope") scope?: "site" | "place" | "all",
    @Query("rangeDays") rangeDays?: string
  ) {
    return this.subscriptionService.getSummary({
      scope: scope as "site" | "place" | "all" | undefined,
      rangeDays: rangeDays ? parseInt(rangeDays, 10) : undefined,
    });
  }

  @Get("/subscriptions/trends")
  @Roles(UserRole.superadmin)
  async getSubscriptionTrends(
    @Query("scope") scope?: "site" | "place" | "all",
    @Query("weeks") weeks?: string
  ) {
    return this.subscriptionService.getTrends({
      scope: scope as "site" | "place" | "all" | undefined,
      weeks: weeks ? parseInt(weeks, 10) : undefined,
    });
  }

  @Put("/subscriptions/:scope/:id")
  @Roles(UserRole.superadmin)
  async updateSubscription(
    @Param("scope") scope: "site" | "place",
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.subscriptionService.update(scope, id, dto, user.id);
  }

  @Post("/subscriptions/:scope/:id/extend")
  @Roles(UserRole.superadmin)
  async extendSubscription(
    @Param("scope") scope: "site" | "place",
    @Param("id") id: string,
    @CurrentUser() user: { id: string }
  ) {
    return this.subscriptionService.extend(scope, id, user.id);
  }

  @Get("/subscriptions/:scope/:id/history")
  @Roles(UserRole.superadmin)
  async getSubscriptionHistory(
    @Param("scope") scope: "site" | "place",
    @Param("id") id: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.subscriptionService.getHistory(scope, id, skipNum, takeNum);
  }

  // ==================== Galleries ====================

  @Get("/galleries")
  async getGalleries(
    @CurrentUser() user: { id: string; siteIds: string[] },
    @Query("siteId") siteIdParam?: string,
    @Query("placeId") placeId?: string,
    @Query("eventId") eventId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.galleryService.findAll(user.id, siteId, placeId, eventId, pageNum, limitNum);
  }

  @Get("/galleries/:id")
  async getGallery(
    @CurrentUser() user: { id: string; siteIds: string[] },
    @Param("id") id: string,
    @Query("siteId") siteIdParam?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.galleryService.findOne(user.id, id, siteId);
  }

  @Post("/galleries")
  async createGallery(
    @CurrentUser() user: { id: string; siteIds: string[] },
    @Body() dto: CreateGalleryDto
  ) {
    if (!user.siteIds.includes(dto.siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.galleryService.create(user.id, dto);
  }

  @Put("/galleries/:id")
  async updateGallery(
    @CurrentUser() user: { id: string; siteIds: string[] },
    @Param("id") id: string,
    @Body() dto: UpdateGalleryDto,
    @Query("siteId") siteIdParam?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.galleryService.update(id, user.id, siteId, dto);
  }

  @Delete("/galleries/:id")
  async deleteGallery(
    @CurrentUser() user: { id: string; siteIds: string[] },
    @Param("id") id: string,
    @Query("siteId") siteIdParam?: string
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new Error("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.galleryService.delete(user.id, id, siteId);
  }

  // ==================== Site Status & Statistics ====================

  @Get("/site-status")
  @Roles(UserRole.superadmin)
  async getSiteStatus() {
    const [
      totalSites,
      activeSites,
      totalPlaces,
      activePlaces,
      totalEvents,
      activeEvents,
      upcomingEvents,
      totalUsers,
      activeUsers,
      totalCategories,
      totalTags,
      totalTowns,
      totalGalleries,
      totalSubscriptions,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.site.count(),
      this.prisma.site.count({ where: { isActive: true } }),
      this.prisma.place.count(),
      this.prisma.place.count({ where: { isActive: true } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { isActive: true } }),
      this.prisma.event.count({
        where: {
          isActive: true,
          startDate: { gte: new Date() },
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.category.count(),
      this.prisma.tag.count(),
      this.prisma.town.count(),
      this.prisma.gallery.count({ where: { isActive: true } }),
      this.prisma.siteSubscription.count(),
      this.prisma.siteSubscription.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      recentPlaces,
      recentEvents,
      recentUsers,
      recentEventLogs,
    ] = await Promise.all([
      this.prisma.place.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.event.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.eventLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Get sites by plan
    const sitesByPlan = await this.prisma.site.groupBy({
      by: ["plan"],
      _count: true,
    });

    return {
      overview: {
        sites: {
          total: totalSites,
          active: activeSites,
          inactive: totalSites - activeSites,
        },
        places: {
          total: totalPlaces,
          active: activePlaces,
          inactive: totalPlaces - activePlaces,
        },
        events: {
          total: totalEvents,
          active: activeEvents,
          upcoming: upcomingEvents,
          inactive: totalEvents - activeEvents,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        content: {
          categories: totalCategories,
          tags: totalTags,
          towns: totalTowns,
          galleries: totalGalleries,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          inactive: totalSubscriptions - activeSubscriptions,
        },
      },
      recentActivity: {
        places: recentPlaces,
        events: recentEvents,
        users: recentUsers,
        eventLogs: recentEventLogs,
        period: "7 days",
      },
      sitesByPlan: sitesByPlan.map((item) => ({
        plan: item.plan,
        count: item._count,
      })),
    };
  }

  // ==================== Cache Management ====================

  @Post("/cache/invalidate")
  @Roles(UserRole.superadmin)
  async invalidateCache(
    @Body() body: { cacheType: string },
    @CurrentUser() user: { id: string; siteIds: string[] }
  ) {
    const { cacheType } = body;

    // Log the cache invalidation action (use first site if available, otherwise skip)
    if (user.siteIds && user.siteIds.length > 0) {
      await this.eventLogService.create({
        siteId: user.siteIds[0], // Use first site for global actions
        userId: user.id,
        action: "cache_invalidate",
        entityType: "system",
        entityId: cacheType,
        description: `Cache invalidated: ${cacheType}`,
      }).catch((err) => console.error("Failed to log cache invalidation:", err));
    }

    return {
      success: true,
      message: `Cache invalidated: ${cacheType}`,
      cacheType,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== Collections ====================

  @Get("/collections")
  @Roles(UserRole.superadmin)
  async getCollections(@CurrentUser() user: { id: string }) {
    try {
      return await this.collectionService.findAll();
    } catch (error) {
      console.error("Error in getCollections controller:", error);
      throw error;
    }
  }

  @Get("/collections/:id")
  @Roles(UserRole.superadmin)
  async getCollection(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    // Don't allow fetching with "new" as ID
    if (id === "new") {
      throw new NotFoundException("Collection not found");
    }
    return this.collectionService.findOne(id);
  }

  @Post("/collections")
  @Roles(UserRole.superadmin)
  async createCollection(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() user: { id: string }
  ) {
    const result = await this.collectionService.create(dto);
    
    // Log the action
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "", // Use first site if available
      userId: user.id,
      action: "create",
      entityType: "collection",
      entityId: result.id,
      description: `Collection created: ${result.slug}`,
    }).catch(err => console.error("Failed to log create collection:", err));
    
    return result;
  }

  @Put("/collections/:id")
  @Roles(UserRole.superadmin)
  async updateCollection(
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: { id: string }
  ) {
    const oldCollection = await this.collectionService.findOne(id);
    const result = await this.collectionService.update(id, dto);
    
    // Log the action
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "update",
      entityType: "collection",
      entityId: id,
      description: `Collection updated: ${result.slug}`,
    }).catch(err => console.error("Failed to log update collection:", err));
    
    return result;
  }

  @Delete("/collections/:id")
  @Roles(UserRole.superadmin)
  async deleteCollection(
    @Param("id") id: string,
    @CurrentUser() user: { id: string }
  ) {
    const collection = await this.collectionService.findOne(id);
    await this.collectionService.delete(id);
    
    // Log the action
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "delete",
      entityType: "collection",
      entityId: id,
      description: `Collection deleted: ${collection.slug}`,
    }).catch(err => console.error("Failed to log delete collection:", err));
    
    return { success: true };
  }

  // Collection Items

  @Post("/collections/:collectionId/items")
  @Roles(UserRole.superadmin)
  async addCollectionItem(
    @Param("collectionId") collectionId: string,
    @Body() dto: Omit<CreateCollectionItemDto, "collectionId">,
    @CurrentUser() user: { id: string }
  ) {
    const result = await this.collectionService.addItem({
      ...dto,
      collectionId,
    });
    
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "create",
      entityType: "collectionItem",
      entityId: result.id,
      description: `Collection item added to collection ${collectionId}`,
    }).catch(err => console.error("Failed to log add collection item:", err));
    
    return result;
  }

  @Put("/collections/items/:itemId")
  @Roles(UserRole.superadmin)
  async updateCollectionItem(
    @Param("itemId") itemId: string,
    @Body() dto: UpdateCollectionItemDto,
    @CurrentUser() user: { id: string }
  ) {
    const result = await this.collectionService.updateItem(itemId, dto);
    
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "update",
      entityType: "collectionItem",
      entityId: itemId,
      description: `Collection item updated`,
    }).catch(err => console.error("Failed to log update collection item:", err));
    
    return result;
  }

  @Delete("/collections/items/:itemId")
  @Roles(UserRole.superadmin)
  async deleteCollectionItem(
    @Param("itemId") itemId: string,
    @CurrentUser() user: { id: string }
  ) {
    await this.collectionService.deleteItem(itemId);
    
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "delete",
      entityType: "collectionItem",
      entityId: itemId,
      description: `Collection item deleted`,
    }).catch(err => console.error("Failed to log delete collection item:", err));
    
    return { success: true };
  }

  @Put("/collections/:collectionId/items/reorder")
  @Roles(UserRole.superadmin)
  async reorderCollectionItems(
    @Param("collectionId") collectionId: string,
    @Body() body: { itemIds: string[] },
    @CurrentUser() user: { id: string }
  ) {
    const result = await this.collectionService.reorderItems(collectionId, body.itemIds);
    
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "update",
      entityType: "collection",
      entityId: collectionId,
      description: `Collection items reordered`,
    }).catch(err => console.error("Failed to log reorder collection items:", err));
    
    return result;
  }

  @Put("/collections/:collectionId/items")
  @Roles(UserRole.superadmin)
  async updateCollectionItems(
    @Param("collectionId") collectionId: string,
    @Body() body: { items: Array<{
      id?: string;
      siteId: string;
      order: number;
      isHighlighted?: boolean;
      translations?: Array<{
        lang: string;
        titleOverride?: string | null;
        descriptionOverride?: string | null;
        imageOverride?: string | null;
      }>;
    }> },
    @CurrentUser() user: { id: string }
  ) {
    // Convert lang strings to Lang enum
    const itemsWithLangEnum = body.items.map(item => ({
      ...item,
      translations: item.translations?.map(t => ({
        ...t,
        lang: t.lang as any, // Lang enum from Prisma
      })),
    }));
    
    const result = await this.collectionService.updateItems(collectionId, itemsWithLangEnum);
    
    await this.eventLogService.create({
      siteId: (user as any).siteIds?.[0] || "",
      userId: user.id,
      action: "update",
      entityType: "collection",
      entityId: collectionId,
      description: `Collection items updated (${body.items.length} items)`,
    }).catch(err => console.error("Failed to log update collection items:", err));
    
    return result;
  }
}


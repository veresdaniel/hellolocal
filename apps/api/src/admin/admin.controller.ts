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
import { AdminLegalService, CreateLegalPageDto, UpdateLegalPageDto } from "./admin-legal.service";
import { AdminStaticPageService, CreateStaticPageDto, UpdateStaticPageDto } from "./admin-static-page.service";
import { AdminTenantService, CreateTenantDto, UpdateTenantDto } from "./admin-tenant.service";
import { AdminAppSettingsService, AppSettingDto } from "./admin-app-settings.service";
import { AdminEventService, CreateEventDto, UpdateEventDto } from "./admin-event.service";
import { AdminEventLogService, EventLogFilterDto } from "./admin-eventlog.service";
import { TwoFactorService } from "../two-factor/two-factor.service";
import { PrismaService } from "../prisma/prisma.service";

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
    private readonly tenantService: AdminTenantService,
    private readonly appSettingsService: AdminAppSettingsService,
    private readonly eventService: AdminEventService,
    private readonly eventLogService: AdminEventLogService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  // ==================== Categories ====================

  @Get("/categories")
  async getCategories(
    @CurrentUser() user: { tenantIds: string[] },
    @Query("tenantId") tenantIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    // Use tenantId from query if provided, otherwise use first tenant from user
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    // Verify user has access to this tenant
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.categoryService.findAll(tenantId, pageNum, limitNum);
  }

  @Get("/categories/:id")
  async getCategory(@Param("id") id: string, @CurrentUser() user: { tenantIds: string[] }) {
    const tenantId = user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    return this.categoryService.findOne(id, tenantId);
  }

  @Post("/categories")
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    // Use tenantId from user if not provided
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.categoryService.create(dto);
    
    // Log the action
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "category",
      entityId: result.id,
      description: `Created category`,
    }).catch(err => console.error("Failed to log create category:", err));
    
    return result;
  }

  @Put("/categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.categoryService.update(id, tenantId, dto);
    
    // Log the action
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "category",
      entityId: id,
      description: `Updated category`,
    }).catch(err => console.error("Failed to log update category:", err));
    
    return result;
  }

  @Delete("/categories/:id")
  async deleteCategory(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.categoryService.remove(id, tenantId);
    
    // Log the action
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "category",
      entityId: id,
      description: `Deleted category`,
    }).catch(err => console.error("Failed to log delete category:", err));
    
    return result;
  }

  @Put("/categories/reorder")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
  async reorderCategories(
    @Body() body: { tenantId: string; updates: Array<{ id: string; parentId: string | null; order: number }> },
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = body.tenantId || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.categoryService.reorder(tenantId, body.updates);
  }

  // ==================== Tags ====================

  @Get("/tags")
  async getTags(
    @Query("tenantId") tenantIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.tagService.findAll(tenantId, page, limit);
  }

  @Get("/tags/:id")
  async getTag(@Param("id") id: string, @CurrentUser() user: { tenantIds: string[] }) {
    const tenantId = user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    return this.tagService.findOne(id, tenantId);
  }

  @Post("/tags")
  async createTag(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.tagService.create(dto);
    
    // Log the action
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "tag",
      entityId: result.id,
      description: `Created tag`,
    }).catch(err => console.error("Failed to log create tag:", err));
    
    return result;
  }

  @Put("/tags/:id")
  async updateTag(
    @Param("id") id: string,
    @Body() dto: UpdateTagDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.tagService.update(id, tenantId, dto);
    
    // Log the action
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "tag",
      entityId: id,
      description: `Updated tag`,
    }).catch(err => console.error("Failed to log update tag:", err));
    
    return result;
  }

  @Delete("/tags/:id")
  async deleteTag(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.tagService.remove(id, tenantId);
    
    // Log the action
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "tag",
      entityId: id,
      description: `Deleted tag`,
    }).catch(err => console.error("Failed to log delete tag:", err));
    
    return result;
  }

  // ==================== Price Bands ====================

  @Get("/price-bands")
  async getPriceBands(
    @Query("tenantId") tenantIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.priceBandService.findAll(tenantId, page, limit);
  }

  @Get("/price-bands/:id")
  async getPriceBand(@Param("id") id: string, @CurrentUser() user: { tenantIds: string[] }) {
    const tenantId = user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    return this.priceBandService.findOne(id, tenantId);
  }

  @Post("/price-bands")
  async createPriceBand(
    @Body() dto: CreatePriceBandDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.priceBandService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "priceBand",
      entityId: result.id,
      description: `Created price band`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/price-bands/:id")
  async updatePriceBand(
    @Param("id") id: string,
    @Body() dto: UpdatePriceBandDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.priceBandService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "priceBand",
      entityId: id,
      description: `Updated price band`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/price-bands/:id")
  async deletePriceBand(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.priceBandService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "priceBand",
      entityId: id,
      description: `Deleted price band`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Towns ====================

  @Get("/towns")
  async getTowns(
    @Query("tenantId") tenantIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.townService.findAll(tenantId, page, limit);
  }

  @Get("/towns/:id")
  async getTown(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.townService.findOne(id, tenantId);
  }

  @Post("/towns")
  async createTown(
    @Body() dto: CreateTownDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.townService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "town",
      entityId: result.id,
      description: `Created town`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/towns/:id")
  async updateTown(
    @Param("id") id: string,
    @Body() dto: UpdateTownDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.townService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "town",
      entityId: id,
      description: `Updated town`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/towns/:id")
  async deleteTown(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.townService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "town",
      entityId: id,
      description: `Deleted town`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Places ====================

  @Get("/places")
  async getPlaces(
    @Query("tenantId") tenantIdParam: string | undefined,
    @Query("page") pageParam: string | undefined,
    @Query("limit") limitParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    return this.placeService.findAll(tenantId, page, limit);
  }

  @Get("/places/:id")
  async getPlace(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.placeService.findOne(id, tenantId);
  }

  @Post("/places")
  async createPlace(
    @Body() dto: CreatePlaceDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.placeService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "place",
      entityId: result.id,
      description: `Created place`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/places/:id")
  async updatePlace(
    @Param("id") id: string,
    @Body() dto: UpdatePlaceDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.placeService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "place",
      entityId: id,
      description: `Updated place`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/places/:id")
  async deletePlace(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.placeService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "place",
      entityId: id,
      description: `Deleted place`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Legal Pages ====================

  @Get("/legal-pages")
  async getLegalPages(
    @CurrentUser() user: { tenantIds: string[] },
    @Query("tenantId") tenantIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.legalService.findAll(tenantId, pageNum, limitNum);
  }

  @Get("/legal-pages/:id")
  async getLegalPage(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.legalService.findOne(id, tenantId);
  }

  @Get("/legal-pages/key/:key")
  async getLegalPageByKey(
    @Param("key") key: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.legalService.findByKey(key, tenantId);
  }

  @Post("/legal-pages")
  async createLegalPage(
    @Body() dto: CreateLegalPageDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.legalService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "legalPage",
      entityId: result.id,
      description: `Created legal page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/legal-pages/:id")
  async updateLegalPage(
    @Param("id") id: string,
    @Body() dto: UpdateLegalPageDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.legalService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "legalPage",
      entityId: id,
      description: `Updated legal page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/legal-pages/:id")
  async deleteLegalPage(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.legalService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "legalPage",
      entityId: id,
      description: `Deleted legal page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Static Pages ====================

  @Get("/static-pages")
  async getStaticPages(
    @CurrentUser() user: { tenantIds: string[] },
    @Query("tenantId") tenantIdParam?: string,
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.staticPageService.findAll(tenantId, category as any, pageNum, limitNum);
  }

  @Get("/static-pages/:id")
  async getStaticPage(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.staticPageService.findOne(id, tenantId);
  }

  @Post("/static-pages")
  async createStaticPage(
    @Body() dto: CreateStaticPageDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.staticPageService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "staticPage",
      entityId: result.id,
      description: `Created static page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/static-pages/:id")
  async updateStaticPage(
    @Param("id") id: string,
    @Body() dto: UpdateStaticPageDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.staticPageService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "staticPage",
      entityId: id,
      description: `Updated static page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/static-pages/:id")
  async deleteStaticPage(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.staticPageService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "staticPage",
      entityId: id,
      description: `Deleted static page`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  // ==================== Users ====================

  @Get("/users")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getUsers(
    @Query("tenantId") tenantId?: string,
    @CurrentUser() user?: { role: UserRole; tenantIds: string[] }
  ) {
    // Superadmin and admin can see all users, others only see users from their tenants
    const filterTenantId = (user?.role === UserRole.superadmin || user?.role === UserRole.admin) ? tenantId : user?.tenantIds[0];
    return this.usersService.findAll(filterTenantId);
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
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }
  ) {
    const result = await this.usersService.create(dto, user.role);
    
    // Log to first tenant of the created user
    const tenantId = dto.tenantIds?.[0] || user.tenantIds[0];
    if (tenantId) {
      await this.eventLogService.create({
        tenantId,
        userId: user.id,
        action: "create",
        entityType: "user",
        entityId: result.id,
        description: `Created user`,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  @Put("/users/:id")
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }
  ) {
    // Users can only update themselves, unless they are superadmin or admin
    if (user.id !== id && user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      throw new ForbiddenException("You can only update your own profile");
    }
    const result = await this.usersService.updateUserWithTenants(id, dto, user.role);
    
    const tenantId = user.tenantIds[0];
    if (tenantId) {
      await this.eventLogService.create({
        tenantId,
        userId: user.id,
        action: "update",
        entityType: "user",
        entityId: id,
        description: `Updated user`,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  @Delete("/users/:id")
  @Roles(UserRole.superadmin)
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }
  ) {
    const result = await this.usersService.remove(id, user.role);
    
    const tenantId = user.tenantIds[0];
    if (tenantId) {
      await this.eventLogService.create({
        tenantId,
        userId: user.id,
        action: "delete",
        entityType: "user",
        entityId: id,
        description: `Deleted user`,
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

  // ==================== Tenants ====================

  @Get("/tenants")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getTenants() {
    return this.tenantService.findAll();
  }

  @Get("/tenants/:id")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getTenant(@Param("id") id: string, @CurrentUser() user: { tenantIds: string[] }) {
    // Superadmin and admin can access any tenant
    // Other users can only access their assigned tenants
    if (user.tenantIds && !user.tenantIds.includes(id)) {
      throw new ForbiddenException("You do not have access to this tenant");
    }
    return this.tenantService.findOne(id);
  }

  @Post("/tenants")
  @Roles(UserRole.superadmin)
  async createTenant(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const result = await this.tenantService.create(dto);
    
    // Log to the first available tenant (or the newly created one)
    const tenantId = result.id;
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "create",
      entityType: "tenant",
      entityId: result.id,
      description: `Created tenant`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/tenants/:id")
  @Roles(UserRole.superadmin)
  async updateTenant(
    @Param("id") id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const result = await this.tenantService.update(id, dto);
    
    await this.eventLogService.create({
      tenantId: id,
      userId: user.id,
      action: "update",
      entityType: "tenant",
      entityId: id,
      description: `Updated tenant`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/tenants/:id")
  @Roles(UserRole.superadmin)
  async deleteTenant(
    @Param("id") id: string,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const result = await this.tenantService.remove(id);
    
    // Log to first available tenant since we're deleting one
    const tenantId = user.tenantIds[0];
    if (tenantId) {
      await this.eventLogService.create({
        tenantId,
        userId: user.id,
        action: "delete",
        entityType: "tenant",
        entityId: id,
        description: `Deleted tenant`,
      }).catch(err => console.error("Failed to log:", err));
    }
    
    return result;
  }

  // ==================== Events ====================

  @Get("/events")
  async getEvents(
    @CurrentUser() user: { tenantIds: string[] },
    @Query("tenantId") tenantIdParam?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new ForbiddenException("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.eventService.findAll(tenantId, pageNum, limitNum);
  }

  @Get("/events/:id")
  async getEvent(@Param("id") id: string, @CurrentUser() user: { tenantIds: string[] }) {
    const tenantId = user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    return this.eventService.findOne(id, tenantId);
  }

  @Post("/events")
  async createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.eventService.create(dto);
    
    await this.eventLogService.create({
      tenantId: dto.tenantId,
      userId: user.id,
      action: "create",
      entityType: "event",
      entityId: result.id,
      description: `Created event`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Put("/events/:id")
  async updateEvent(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.eventService.update(id, tenantId, dto);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "update",
      entityType: "event",
      entityId: id,
      description: `Updated event`,
    }).catch(err => console.error("Failed to log:", err));
    
    return result;
  }

  @Delete("/events/:id")
  async deleteEvent(
    @Param("id") id: string,
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { id: string; tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new Error("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    const result = await this.eventService.remove(id, tenantId);
    
    await this.eventLogService.create({
      tenantId,
      userId: user.id,
      action: "delete",
      entityType: "event",
      entityId: id,
      description: `Deleted event`,
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

  @Get("/app-settings/map-settings")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getMapSettings(
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new ForbiddenException("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }
    return this.appSettingsService.getMapSettings(tenantId);
  }

  @Put("/app-settings/map-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setMapSettings(
    @Body() dto: { tenantId: string; townId?: string | null; lat?: number | null; lng?: number | null; zoom?: number | null },
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      throw new ForbiddenException("tenantId is required");
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }
    return this.appSettingsService.setMapSettings(dto.tenantId, {
      townId: dto.townId,
      lat: dto.lat,
      lng: dto.lng,
      zoom: dto.zoom,
    });
  }

  @Get("/app-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getAppSettings() {
    return this.appSettingsService.findAll();
  }

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  // Otherwise /app-settings/site-settings will match /app-settings/:key
  @Get("/app-settings/site-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteSettings(
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!tenantId) {
      throw new ForbiddenException("User has no associated tenant");
    }
    if (!user.tenantIds.includes(tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }
    return this.appSettingsService.getSiteSettings(tenantId);
  }

  @Put("/app-settings/site-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setSiteSettings(
    @Body() dto: {
      tenantId: string;
      siteName?: { hu?: string; en?: string; de?: string };
      siteDescription?: { hu?: string; en?: string; de?: string };
      seoTitle?: { hu?: string; en?: string; de?: string };
      seoDescription?: { hu?: string; en?: string; de?: string };
      isCrawlable?: boolean;
      defaultPlaceholderCardImage?: string | null;
      defaultPlaceholderDetailHeroImage?: string | null;
      defaultEventPlaceholderCardImage?: string | null;
      brandBadgeIcon?: string | null;
      faviconUrl?: string | null;
    },
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      throw new ForbiddenException("tenantId is required");
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }
    return this.appSettingsService.setSiteSettings(dto.tenantId, {
      siteName: dto.siteName,
      siteDescription: dto.siteDescription,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      isCrawlable: dto.isCrawlable,
      defaultPlaceholderCardImage: dto.defaultPlaceholderCardImage,
      defaultPlaceholderDetailHeroImage: dto.defaultPlaceholderDetailHeroImage,
      defaultEventPlaceholderCardImage: dto.defaultEventPlaceholderCardImage,
      brandBadgeIcon: dto.brandBadgeIcon,
      faviconUrl: dto.faviconUrl,
    });
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
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    return this.eventLogService.findAll(user.role, user.tenantIds, normalizedFilters);
  }

  @Get("/event-logs/filter-options")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getEventLogFilterOptions(@CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }) {
    return this.eventLogService.getFilterOptions(user.role, user.tenantIds);
  }

  @Get("/event-logs/export")
  @Roles(UserRole.superadmin, UserRole.admin)
  async exportEventLogs(
    @Query() filters: EventLogFilterDto,
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] },
    @Res() res: Response
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    const csv = await this.eventLogService.exportToCsv(user.role, user.tenantIds, normalizedFilters);
    
    const filename = `event-logs-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Delete("/event-logs")
  @Roles(UserRole.superadmin)
  async deleteEventLogs(
    @Query() filters: EventLogFilterDto,
    @CurrentUser() user: { id: string; role: UserRole; tenantIds: string[] }
  ) {
    // Convert string query params to numbers
    const normalizedFilters: EventLogFilterDto = {
      ...filters,
      page: filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : undefined,
      limit: filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : undefined,
    };
    return this.eventLogService.delete(user.role, user.tenantIds, normalizedFilters);
  }

  @Post("/maintenance/generate-missing-slugs")
  @Roles(UserRole.superadmin)
  async generateMissingSlugs(@Query("tenantId") tenantIdParam: string | undefined, @CurrentUser() user: { tenantIds: string[] }) {
    const tenantId = tenantIdParam || user.tenantIds[0];
    if (!user.tenantIds.includes(tenantId)) {
      throw new ForbiddenException("User does not have access to this tenant");
    }

    const result = await this.placeService.generateMissingSlugs(tenantId);
    return result;
  }
}


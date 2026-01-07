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
} from "@nestjs/common";
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
import { AdminTenantService, CreateTenantDto, UpdateTenantDto } from "./admin-tenant.service";
import { AdminAppSettingsService, AppSettingDto } from "./admin-app-settings.service";
import { AdminEventService, CreateEventDto, UpdateEventDto } from "./admin-event.service";
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
    private readonly tenantService: AdminTenantService,
    private readonly appSettingsService: AdminAppSettingsService,
    private readonly eventService: AdminEventService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  // ==================== Categories ====================

  @Get("/categories")
  async getCategories(
    @Query("tenantId") tenantIdParam: string | undefined,
    @CurrentUser() user: { tenantIds: string[] }
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
    return this.categoryService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    // Use tenantId from user if not provided
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.categoryService.create(dto);
  }

  @Put("/categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
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
    return this.categoryService.update(id, tenantId, dto);
  }

  @Delete("/categories/:id")
  async deleteCategory(
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
    return this.categoryService.remove(id, tenantId);
  }

  // ==================== Tags ====================

  @Get("/tags")
  async getTags(
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
    return this.tagService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.tagService.create(dto);
  }

  @Put("/tags/:id")
  async updateTag(
    @Param("id") id: string,
    @Body() dto: UpdateTagDto,
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
    return this.tagService.update(id, tenantId, dto);
  }

  @Delete("/tags/:id")
  async deleteTag(
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
    return this.tagService.remove(id, tenantId);
  }

  // ==================== Price Bands ====================

  @Get("/price-bands")
  async getPriceBands(
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
    return this.priceBandService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.priceBandService.create(dto);
  }

  @Put("/price-bands/:id")
  async updatePriceBand(
    @Param("id") id: string,
    @Body() dto: UpdatePriceBandDto,
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
    return this.priceBandService.update(id, tenantId, dto);
  }

  @Delete("/price-bands/:id")
  async deletePriceBand(
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
    return this.priceBandService.remove(id, tenantId);
  }

  // ==================== Towns ====================

  @Get("/towns")
  async getTowns(
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
    return this.townService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.townService.create(dto);
  }

  @Put("/towns/:id")
  async updateTown(
    @Param("id") id: string,
    @Body() dto: UpdateTownDto,
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
    return this.townService.update(id, tenantId, dto);
  }

  @Delete("/towns/:id")
  async deleteTown(
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
    return this.townService.remove(id, tenantId);
  }

  // ==================== Places ====================

  @Get("/places")
  async getPlaces(
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
    return this.placeService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.placeService.create(dto);
  }

  @Put("/places/:id")
  async updatePlace(
    @Param("id") id: string,
    @Body() dto: UpdatePlaceDto,
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
    return this.placeService.update(id, tenantId, dto);
  }

  @Delete("/places/:id")
  async deletePlace(
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
    return this.placeService.remove(id, tenantId);
  }

  // ==================== Legal Pages ====================

  @Get("/legal-pages")
  async getLegalPages(
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
    return this.legalService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.legalService.create(dto);
  }

  @Put("/legal-pages/:id")
  async updateLegalPage(
    @Param("id") id: string,
    @Body() dto: UpdateLegalPageDto,
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
    return this.legalService.update(id, tenantId, dto);
  }

  @Delete("/legal-pages/:id")
  async deleteLegalPage(
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
    return this.legalService.remove(id, tenantId);
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
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.usersService.create(dto, user.role);
  }

  @Put("/users/:id")
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string; role: UserRole }
  ) {
    // Users can only update themselves, unless they are superadmin or admin
    if (user.id !== id && user.role !== UserRole.superadmin && user.role !== UserRole.admin) {
      throw new ForbiddenException("You can only update your own profile");
    }
    return this.usersService.updateUserWithTenants(id, dto, user.role);
  }

  @Delete("/users/:id")
  @Roles(UserRole.superadmin)
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.usersService.remove(id, user.role);
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
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Put("/tenants/:id")
  @Roles(UserRole.superadmin)
  async updateTenant(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete("/tenants/:id")
  @Roles(UserRole.superadmin)
  async deleteTenant(@Param("id") id: string) {
    return this.tenantService.remove(id);
  }

  // ==================== Events ====================

  @Get("/events")
  async getEvents(
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
    return this.eventService.findAll(tenantId);
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
    @CurrentUser() user: { tenantIds: string[] }
  ) {
    if (!dto.tenantId) {
      dto.tenantId = user.tenantIds[0];
    }
    if (!user.tenantIds.includes(dto.tenantId)) {
      throw new Error("User does not have access to this tenant");
    }
    return this.eventService.create(dto);
  }

  @Put("/events/:id")
  async updateEvent(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
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
    return this.eventService.update(id, tenantId, dto);
  }

  @Delete("/events/:id")
  async deleteEvent(
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
    return this.eventService.remove(id, tenantId);
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

  @Get("/app-settings/site-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async getSiteSettings() {
    return this.appSettingsService.getSiteSettings();
  }

  @Put("/app-settings/site-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setSiteSettings(@Body() settings: {
    siteName?: { hu?: string; en?: string; de?: string };
    siteDescription?: { hu?: string; en?: string; de?: string };
    seoTitle?: { hu?: string; en?: string; de?: string };
    seoDescription?: { hu?: string; en?: string; de?: string };
  }) {
    return this.appSettingsService.setSiteSettings(settings);
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


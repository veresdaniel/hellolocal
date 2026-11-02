import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CountryService, type CountryWriteDto } from "./country.service";

@Controller()
export class CountryController {
  constructor(private readonly countries: CountryService) {}

  @Get("/api/public/countries")
  listPublic(@Query("lang") lang?: string) {
    return this.countries.listPublic(lang || "hu");
  }

  @Get("/api/public/countries/:id/towns")
  suggestTowns(@Param("id") id: string, @Query("q") q?: string) {
    return this.countries.suggestTowns(id, q || "");
  }

  @Get("/api/admin/countries")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  listAdmin() {
    return this.countries.listAdmin();
  }

  @Get("/api/admin/countries/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  findOne(@Param("id") id: string) {
    return this.countries.findOne(id);
  }

  @Post("/api/admin/countries")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  create(@Body() dto: CountryWriteDto) {
    return this.countries.create(dto);
  }

  @Put("/api/admin/countries/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  update(@Param("id") id: string, @Body() dto: CountryWriteDto) {
    return this.countries.update(id, dto);
  }

  @Put("/api/admin/sites/:id/country")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  assignRegion(
    @Param("id") id: string,
    @Body() body: { countryId?: string; code?: string },
    @CurrentUser() user: { role: UserRole }
  ) {
    if (body.code) return this.countries.assignRegionByCode(id, body.code);
    if (!body.countryId) throw new BadRequestException("Country code is required");
    return this.countries.assignRegion(id, body.countryId, user.role);
  }

  @Put("/api/admin/countries/:id/domains")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  saveDomains(
    @Param("id") id: string,
    @Body() body: { domains?: Array<{ domain: string; defaultLang?: string; isPrimary?: boolean }> }
  ) {
    return this.countries.saveDomains(id, body.domains || []);
  }

  @Post("/api/admin/countries/:id/regions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  addRegion(
    @Param("id") id: string,
    @Body() body: { name: string; slug: string }
  ) {
    return this.countries.addRegion(id, body);
  }

  @Get("/api/admin/signups")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  listPending() {
    return this.countries.listPending();
  }

  @Post("/api/admin/signups/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.superadmin)
  approve(
    @Param("id") id: string,
    @Body() body: { townId?: string; regionId?: string }
  ) {
    return this.countries.approve(id, body);
  }
}

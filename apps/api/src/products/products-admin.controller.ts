import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ProductsService, type ProductWriteInput } from "./products.service";

type Actor = { id: string; role: UserRole; siteIds?: string[] };

@Controller("/api/admin/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin, UserRole.admin, UserRole.editor)
export class ProductsAdminController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Query("siteId") siteId: string,
    @Query("q") q: string | undefined,
    @Query("placeId") placeId: string | undefined,
    @CurrentUser() user: Actor
  ) {
    return this.products.listAdmin(siteId, user, q, placeId);
  }

  @Post()
  create(
    @Query("siteId") siteId: string,
    @Body() body: ProductWriteInput,
    @CurrentUser() user: Actor
  ) {
    return this.products.create(siteId, body, user);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Query("siteId") siteId: string,
    @Body() body: ProductWriteInput,
    @CurrentUser() user: Actor
  ) {
    return this.products.update(id, siteId, body, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("siteId") siteId: string, @CurrentUser() user: Actor) {
    return this.products.remove(id, siteId, user);
  }
}

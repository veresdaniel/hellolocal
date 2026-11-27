import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { PlatformGuidesService, type GuideWriteInput } from "./platform-guides.service";

@Controller("/api/public/platform-guides")
export class PlatformGuidesController {
  constructor(private readonly guides: PlatformGuidesService) {}

  @Get()
  list(@Query("lang") lang?: string) {
    return this.guides.listPublic(lang);
  }

  @Get(":slug")
  one(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return this.guides.getPublic(slug, lang);
  }
}

@Controller("/api/admin/platform-guides")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin)
export class AdminPlatformGuidesController {
  constructor(private readonly guides: PlatformGuidesService) {}

  @Get()
  list() {
    return this.guides.listAdmin();
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return this.guides.getAdmin(id);
  }

  @Post()
  create(@Body() body: GuideWriteInput) {
    return this.guides.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: GuideWriteInput) {
    return this.guides.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.guides.remove(id);
  }
}

import { Body, Controller, Delete, Get, Param, Put, Post, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UiCopyService, type UiCatalogs } from "./ui-copy.service";

@Controller("/api/public/ui")
@SkipThrottle({ default: true, strict: true })
export class PublicUiCopyController {
  constructor(private readonly copy: UiCopyService) {}

  @Get("languages")
  languages() {
    return this.copy.languages();
  }

  @Get(":lang")
  messages(@Param("lang") lang: string) {
    return this.copy.publicMessages(lang);
  }
}

@Controller("/api/admin/ui-copy")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin)
@SkipThrottle({ default: true, strict: true })
export class AdminUiCopyController {
  constructor(private readonly copy: UiCopyService) {}

  @Get("languages")
  languages() {
    return this.copy.languages();
  }

  @Post("languages")
  addLanguage(@Body() body: { code?: string }, @CurrentUser() user: { role?: string }) {
    return this.copy.addLanguage(body?.code ?? "", user?.role);
  }

  @Delete("languages/:code")
  removeLanguage(@Param("code") code: string, @CurrentUser() user: { role?: string }) {
    return this.copy.removeLanguage(code, user?.role);
  }

  @Get("messages")
  messages(@Query("lang") lang: string) {
    return this.copy.editorMessages(lang || "hu");
  }

  @Put("messages")
  save(
    @Body() body: { lang?: string; entries?: Record<string, string> },
    @CurrentUser() user: { role?: string }
  ) {
    return this.copy.saveMessages(body?.lang ?? "", body?.entries ?? {}, user?.role);
  }

  @Post("sync")
  sync(@Body() body: { catalogs?: UiCatalogs }, @CurrentUser() user: { role?: string }) {
    return this.copy.syncMissing(body?.catalogs ?? {}, user?.role);
  }
}

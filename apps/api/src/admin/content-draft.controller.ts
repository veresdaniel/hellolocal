import { Body, Controller, Get, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ContentDraftRequestDto, ContentDraftSettingsDto } from "./content-draft.dto";
import { ContentDraftService } from "./content-draft.service";

type Actor = { id: string; role: UserRole };

@Controller("/api/admin/content-draft")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
export class ContentDraftController {
  constructor(private readonly drafts: ContentDraftService) {}

  @Get("/status")
  status(
    @CurrentUser() user: Actor,
    @Query("siteId") siteId?: string,
    @Query("placeId") placeId?: string
  ) {
    return this.drafts.status(user, siteId, placeId);
  }

  @Put("/settings")
  @Roles(UserRole.superadmin)
  saveSettings(@CurrentUser() user: Actor, @Body() dto: ContentDraftSettingsDto) {
    return this.drafts.saveSettings(user, dto);
  }

  @Post()
  @Throttle({ strict: { limit: 8, ttl: 600000 } })
  draft(@CurrentUser() user: Actor, @Body() dto: ContentDraftRequestDto) {
    return this.drafts.draft(user, dto);
  }
}

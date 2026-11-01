import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PlatformSettingsService } from "./platform-settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";
import { assertLang } from "../common/lang";
import { RbacService } from "../auth/rbac.service";
import { canEditCopy } from "../auth/copy-access";

@Controller("api/:lang/:siteKey/platform-settings")
@SkipThrottle({ default: true, strict: true })
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  get(@Param("lang") lang: string, @Param("siteKey") siteKey: string) {
    // siteKey can be "default" or empty string for single-site mode
    const effectiveSiteKey = siteKey && siteKey !== "default" ? siteKey : undefined;
    return this.service.getPlatformSettings({ lang, siteKey: effectiveSiteKey });
  }
}

/**
 * Admin platform settings endpoints
 * GET /api/admin/platform-settings?siteId=...
 * PUT /api/admin/platform-settings
 * GET /api/admin/platform-settings/map-settings?siteId=...
 * PUT /api/admin/platform-settings/map-settings
 */
@Controller("api/admin/platform-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
@SkipThrottle({ default: true, strict: true })
export class AdminPlatformSettingsController {
  constructor(
    private readonly service: PlatformSettingsService,
    private readonly rbac: RbacService
  ) {}

  @Get("map-settings")
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async getMapSettings(
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new ForbiddenException("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.service.getMapSettings(siteId);
  }

  @Put("map-settings")
  @Roles(UserRole.superadmin, UserRole.admin)
  async setMapSettings(
    @Body()
    dto: {
      siteId: string;
      townId?: string | null;
      lat?: number | null;
      lng?: number | null;
      zoom?: number | null;
    },
    @CurrentUser() user: { siteIds: string[] }
  ) {
    if (!dto.siteId) {
      throw new ForbiddenException("siteId is required");
    }
    if (!user.siteIds.includes(dto.siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.service.setMapSettings(dto.siteId, {
      townId: dto.townId,
      lat: dto.lat,
      lng: dto.lng,
      zoom: dto.zoom,
    });
  }

  @Get()
  @Roles(UserRole.superadmin, UserRole.admin)
  async getPlatformSettings(
    @Query("siteId") siteIdParam: string | undefined,
    @CurrentUser() user: { siteIds: string[] }
  ) {
    const siteId = siteIdParam || user.siteIds[0];
    if (!siteId) {
      throw new ForbiddenException("User has no associated site");
    }
    if (!user.siteIds.includes(siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.service.getPlatformSettingsForAdmin(siteId);
  }

  @Put()
  @Roles(UserRole.superadmin, UserRole.admin, UserRole.editor, UserRole.viewer)
  async setPlatformSettings(
    @Body()
    dto: {
      siteId: string;
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
    @CurrentUser() user: { id: string; role: UserRole; siteIds: string[] }
  ) {
    if (!dto.siteId) {
      throw new ForbiddenException("siteId is required");
    }
    const touchesCopy =
      dto.siteName !== undefined ||
      dto.siteDescription !== undefined ||
      dto.seoTitle !== undefined ||
      dto.seoDescription !== undefined;
    const actor = await this.rbac.copyActor(user.id, user.role, dto.siteId);
    const owner = canEditCopy(actor, "site");
    if (touchesCopy && !owner) {
      throw new ForbiddenException(
        "Only the site owner or a superadmin can edit these translations"
      );
    }
    if (!owner && !user.siteIds.includes(dto.siteId)) {
      throw new ForbiddenException("User does not have access to this site");
    }
    if (
      !touchesCopy &&
      !owner &&
      user.role !== UserRole.superadmin &&
      user.role !== UserRole.admin
    ) {
      throw new ForbiddenException("User does not have access to this site");
    }
    return this.service.setPlatformSettings(dto.siteId, {
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

  @Get("feature-matrix")
  @Roles(UserRole.superadmin)
  async getFeatureMatrix() {
    return this.service.getFeatureMatrix();
  }

  @Put("feature-matrix")
  @Roles(UserRole.superadmin)
  async setFeatureMatrix(
    @Body()
    dto: {
      planOverrides?: {
        BASIC?: any;
        PRO?: any;
        BUSINESS?: any;
      } | null;
      placePlanOverrides?: {
        free?: any;
        basic?: any;
        pro?: any;
      } | null;
    },
    @CurrentUser() user: { role?: string }
  ) {
    return this.service.setFeatureMatrix(
      dto.planOverrides !== undefined ? dto.planOverrides : undefined,
      dto.placePlanOverrides !== undefined ? dto.placePlanOverrides : undefined,
      user?.role
    );
  }
}

/**
 * Public platform settings endpoint with path parameters
 * GET /api/public/:lang/:siteKey/platform
 */
@Controller("/api/public/:lang/:siteKey")
@SkipThrottle({ default: true, strict: true })
export class PublicPlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get("platform")
  get(@Param("lang") lang: string, @Param("siteKey") siteKey: string) {
    assertLang(lang);
    // siteKey is optional in service - if "default", use undefined
    const effectiveSiteKey = siteKey && siteKey !== "default" ? siteKey : undefined;
    return this.service.getPlatformSettings({ lang, siteKey: effectiveSiteKey });
  }
}

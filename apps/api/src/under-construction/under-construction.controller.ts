import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import type { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { readCookieHeader, UC_ADMIN_API_PATH, UC_PUBLIC_API_PATH } from "@hellolocal/shared";
import { buildUcSetCookieHeader } from "./under-construction-cookie";
import { UC_COOKIE_NAME, UC_QUERY_PARAM } from "./under-construction.constants";
import { UnderConstructionSaveDto } from "./under-construction.dto";
import { UnderConstructionService } from "./under-construction.service";

@Controller(UC_ADMIN_API_PATH)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin)
export class UnderConstructionAdminController {
  constructor(private readonly underConstruction: UnderConstructionService) {}

  @Get()
  status() {
    return this.underConstruction.getAdminStatus();
  }

  @Put()
  save(@Body() dto: UnderConstructionSaveDto) {
    return this.underConstruction.save(dto);
  }

  @Post("/regenerate-token")
  regenerate() {
    return this.underConstruction.regenerateToken();
  }

  @Post("/invalidate-token")
  invalidate() {
    return this.underConstruction.invalidateToken();
  }
}

/**
 * Public gate check — no auth. Used by SPA + Express SSR (`server.js`).
 * Does not expose the access token in JSON; sets HttpOnly Secure cookie instead.
 */
@Controller(UC_PUBLIC_API_PATH)
// Every public visit checks this through the web container, so the calls share one address.
// A low limit turned into HTTP 429, and the site then drew the construction page.
@SkipThrottle({ default: true, strict: true })
export class UnderConstructionPublicController {
  constructor(private readonly underConstruction: UnderConstructionService) {}

  @Get()
  async gate(
    @Res({ passthrough: true }) res: Response,
    @Query(UC_QUERY_PARAM) access?: string,
    @Query("lang") lang?: string,
    @Headers("cookie") cookieHeader?: string
  ) {
    const cookieToken = readCookieHeader(cookieHeader, UC_COOKIE_NAME);
    const resolved = await this.underConstruction.resolvePublic({
      lang,
      queryToken: typeof access === "string" ? access : null,
      cookieToken,
    });

    if (resolved.refreshCookie && resolved.cookieToken) {
      res.append(
        "Set-Cookie",
        buildUcSetCookieHeader(resolved.cookieToken, resolved.cookieMaxAgeSec)
      );
    } else if (resolved.clearCookie) {
      res.append("Set-Cookie", buildUcSetCookieHeader("", 0, { clear: true }));
    }

    return this.underConstruction.toPublicJson(resolved);
  }
}

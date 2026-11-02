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
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import type { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { buildUcSetCookieHeader } from "./under-construction-cookie";
import { UC_COOKIE_NAME, UC_QUERY_PARAM } from "./under-construction.constants";
import { UnderConstructionSaveDto } from "./under-construction.dto";
import { UnderConstructionService } from "./under-construction.service";

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

@Controller("/api/admin/under-construction")
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
@Controller("/api/app-settings/under-construction")
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class UnderConstructionPublicController {
  constructor(private readonly underConstruction: UnderConstructionService) {}

  @Get()
  async gate(
    @Query(UC_QUERY_PARAM) access?: string,
    @Query("lang") lang?: string,
    @Headers("cookie") cookieHeader?: string,
    @Res({ passthrough: true }) res?: Response
  ) {
    const cookieToken = readCookie(cookieHeader, UC_COOKIE_NAME);
    const resolved = await this.underConstruction.resolvePublic({
      lang,
      queryToken: typeof access === "string" ? access : null,
      cookieToken,
    });

    if (res) {
      if (resolved.refreshCookie && resolved.cookieToken) {
        res.append(
          "Set-Cookie",
          buildUcSetCookieHeader(resolved.cookieToken, resolved.cookieMaxAgeSec)
        );
      } else if (resolved.clearCookie) {
        res.append("Set-Cookie", buildUcSetCookieHeader("", 0, { clear: true }));
      }
    }

    return this.underConstruction.toPublicJson(resolved);
  }
}

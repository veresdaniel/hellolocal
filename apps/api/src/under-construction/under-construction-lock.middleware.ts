import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UC_ACCESS_HEADER, UC_COOKIE_NAME, UC_QUERY_PARAM, isUserRole } from "@hellolocal/shared";
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "../auth/auth.service";
import { UnderConstructionService } from "./under-construction.service";

/**
 * Nest `forRoutes('*')` can make `req.path` unreliable (often `/`).
 * Always prefer `originalUrl` so allowlisted prefixes match.
 */
export function pathFromRequest(req: Pick<Request, "originalUrl" | "url" | "path">): string {
  const raw = req.originalUrl || req.url || req.path || "";
  return String(raw).split("?")[0] || "";
}

/**
 * Paths that must stay reachable while the public site is locked
 * (login, entire admin API tree, health, UC gate itself, Caddy on-demand TLS).
 */
export function isUnderConstructionLockExempt(pathname: string): boolean {
  const path = (pathname || "").split("?")[0] || "";
  if (path === "/health" || path === "/api/health") return true;
  if (path.startsWith("/api/app-settings")) return true;
  if (/(?:^|\/)admin(?:\/|$)/.test(path)) return true;
  if (path.startsWith("/api/auth")) return true;
  if (path.startsWith("/api/two-factor")) return true;
  if (path.startsWith("/api/caddy")) return true;
  return false;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim()) || null;
    } catch {
      return part.slice(idx + 1).trim() || null;
    }
  }
  return null;
}

@Injectable()
export class UnderConstructionLockMiddleware implements NestMiddleware {
  constructor(
    private readonly underConstruction: UnderConstructionService,
    private readonly jwtService: JwtService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = pathFromRequest(req);
    if (isUnderConstructionLockExempt(path)) {
      return next();
    }

    if (this.hasStaffBearer(req)) {
      return next();
    }

    const previewToken = this.previewTokenFromRequest(req);
    if (previewToken && (await this.underConstruction.isValidAccessToken(previewToken))) {
      return next();
    }

    const enabled = await this.underConstruction.isEnabled();
    if (!enabled) {
      return next();
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({
      statusCode: 503,
      message: "Service Unavailable",
      error: "Under Construction",
    });
  }

  private hasStaffBearer(req: Request): boolean {
    const header = req.headers.authorization;
    if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
      return false;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) return false;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return Boolean(payload?.role && isUserRole(String(payload.role)));
    } catch {
      return false;
    }
  }

  private previewTokenFromRequest(req: Request): string | null {
    const headerRaw = req.headers[UC_ACCESS_HEADER] ?? req.headers[UC_ACCESS_HEADER.toLowerCase()];
    if (typeof headerRaw === "string" && headerRaw.trim()) return headerRaw.trim();
    if (Array.isArray(headerRaw) && headerRaw[0]?.trim()) return headerRaw[0].trim();

    const q = req.query?.[UC_QUERY_PARAM];
    if (typeof q === "string" && q.trim()) return q.trim();

    return readCookie(req.headers.cookie, UC_COOKIE_NAME);
  }
}

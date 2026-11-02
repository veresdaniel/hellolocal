import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { isUserRole } from "@hellolocal/shared";
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
  // Any `/admin` segment: `/api/admin/...`, `/api/hu/admin/...`, etc.
  if (/(?:^|\/)admin(?:\/|$)/.test(path)) return true;
  if (path.startsWith("/api/auth")) return true;
  if (path.startsWith("/api/two-factor")) return true;
  if (path.startsWith("/api/caddy")) return true;
  return false;
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

    // Logged-in staff (admin panel users) are outside the public lock.
    if (this.hasStaffBearer(req)) {
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

  /** Valid Bearer JWT with a platform staff role → bypass public UC lock. */
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
}

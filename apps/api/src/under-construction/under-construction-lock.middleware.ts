import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { UnderConstructionService } from "./under-construction.service";

/**
 * Paths that must stay reachable while the public site is locked.
 * Everything else under the API returns 503 when under-development mode is on.
 */
export function isUnderConstructionLockExempt(pathname: string): boolean {
  const path = (pathname || "").split("?")[0] || "";
  if (path === "/health" || path === "/api/health") return true;
  if (path.startsWith("/api/app-settings")) return true;
  if (path.startsWith("/api/admin")) return true;
  if (path.startsWith("/api/auth")) return true;
  if (path.startsWith("/api/two-factor")) return true;
  if (path.startsWith("/api/caddy")) return true;
  return false;
}

@Injectable()
export class UnderConstructionLockMiddleware implements NestMiddleware {
  constructor(private readonly underConstruction: UnderConstructionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.path || req.url || "";
    if (isUnderConstructionLockExempt(path)) {
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
}

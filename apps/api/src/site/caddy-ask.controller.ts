import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { isKnownPublicHostname } from "../common/is-known-public-hostname";

/**
 * Caddy on_demand_tls ask endpoint.
 * GET /api/caddy/ask?domain=example.hu → 200 when the host is in admin DB, else 404.
 * Lets custom domains get Let's Encrypt certs without editing the Caddyfile per domain.
 */
@Controller("/api/caddy")
@SkipThrottle({ default: true, strict: true })
export class CaddyAskController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("ask")
  async ask(@Query("domain") domain: string | undefined): Promise<{ ok: true }> {
    if (!(await isKnownPublicHostname(this.prisma, domain))) {
      throw new NotFoundException();
    }
    return { ok: true };
  }
}

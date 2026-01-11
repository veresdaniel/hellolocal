import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

@Controller()
@SkipThrottle({ default: true, strict: true }) // Health check controller teljesen kizárva a rate limiting alól
export class HealthController {
  @Get("/health")
  health() {
    return { ok: true };
  }

  @Get("/api/health")
  apiHealth() {
    return { ok: true };
  }
}

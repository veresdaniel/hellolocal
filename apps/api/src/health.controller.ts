import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

@Controller()
export class HealthController {
  @SkipThrottle() // Health check endpoint-ok kizárva a rate limiting alól
  @Get("/health")
  health() {
    return { ok: true };
  }

  @SkipThrottle() // Health check endpoint-ok kizárva a rate limiting alól
  @Get("/api/health")
  apiHealth() {
    return { ok: true };
  }
}

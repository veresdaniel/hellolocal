import {
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Post,
  Query,
  Req,
  UseGuards,
  forwardRef,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SignupAbuseService } from "./signup-abuse.service";
import { CountryService } from "../country/country.service";
import { Request } from "express";

@Controller("/api/admin/signup-signals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin)
export class AdminSignupSignalsController {
  constructor(private readonly abuse: SignupAbuseService) {}

  @Get()
  list(@Query("minScore") minScore?: string, @Query("limit") limit?: string) {
    return this.abuse.listSuspicious({
      minScore: minScore ? Number(minScore) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

@Controller("/api/auth/free-trial")
@UseGuards(JwtAuthGuard)
export class FreeTrialCardController {
  constructor(
    private readonly abuse: SignupAbuseService,
    @Optional()
    @Inject(forwardRef(() => CountryService))
    private readonly countries?: CountryService
  ) {}

  @Get("card-status")
  status(@CurrentUser() user: { id: string }) {
    return this.abuse.getCardStatus(user.id);
  }

  @Post("setup-intent")
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  setupIntent(@CurrentUser() user: { id: string }) {
    return this.abuse.createSetupIntent(user.id);
  }

  @Post("confirm-card")
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  async confirm(@CurrentUser() user: { id: string }, @Body() body: { setupIntentId?: string }) {
    const result = await this.abuse.confirmCard(user.id, String(body?.setupIntentId || ""));
    const attached = this.countries
      ? await this.countries.tryAttachPendingAfterCard(user.id).catch(() => null)
      : null;
    return { ...result, attached };
  }
}

/** Public helper so the SPA can decide whether to show the card step. */
@Controller("/api/public/free-trial")
export class PublicFreeTrialController {
  constructor(private readonly abuse: SignupAbuseService) {}

  @Get("requirements")
  async requirements(@Req() _req: Request) {
    const stripeReady = Boolean(this.abuse.getStripe());
    const requireCard = (await this.abuse.isCardRequired()) && stripeReady;
    return {
      requireCard,
      stripeConfigured: stripeReady,
      publishableKey: requireCard ? process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null : null,
    };
  }
}

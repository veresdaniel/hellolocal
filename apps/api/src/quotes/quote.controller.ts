import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { assertPublicFormShield } from "../common/public-form-shield";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { QuoteService, type QuoteRequestInput } from "./quote.service";

/** Lead forms: longer dwell than login (password managers need the short default). */
const LEAD_FORM_MIN_MS = 3000;

@Controller("/api/public/quote-requests")
export class QuoteController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  @Throttle({ strict: { limit: 5, ttl: 60000 } })
  async create(@Body() body: QuoteRequestInput) {
    // Captcha optional: client only loads reCAPTCHA on hosts listed for the site key
    // (hellolocal.hu / custom domains otherwise show Google’s invalid-domain badge).
    await assertPublicFormShield(body, { minMs: LEAD_FORM_MIN_MS, captcha: "optional" });
    return this.quotes.create(body);
  }
}

@Controller("/api/admin/quote-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.superadmin)
export class AdminQuoteController {
  constructor(private readonly quotes: QuoteService) {}

  @Get()
  async list(
    @Query("plan") plan?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
    @Query("contacted") contacted?: string
  ) {
    const contactedFilter =
      contacted === "0" || contacted === "false"
        ? false
        : contacted === "1" || contacted === "true"
          ? true
          : undefined;
    return this.quotes.listForAdmin({
      plan,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      contacted: contactedFilter,
    });
  }

  @Put(":id/contacted")
  async setContacted(@Param("id") id: string, @Body() body: { contacted?: unknown }) {
    return this.quotes.setContacted(id, Boolean(body?.contacted));
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.quotes.remove(id);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { assertPublicFormShield } from "../common/public-form-shield";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { QuoteService, type QuoteRequestInput } from "./quote.service";

@Controller("/api/public/quote-requests")
export class QuoteController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  async create(@Body() body: QuoteRequestInput) {
    await assertPublicFormShield(body);
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
    @Query("skip") skip?: string
  ) {
    return this.quotes.listForAdmin({
      plan,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
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

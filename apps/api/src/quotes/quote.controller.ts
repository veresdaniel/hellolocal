import { Body, Controller, Post } from "@nestjs/common";
import { assertPublicFormShield } from "../common/public-form-shield";
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

import { Body, Controller, Post } from "@nestjs/common";
import { QuoteService, type QuoteRequestInput } from "./quote.service";

@Controller("/api/public/quote-requests")
export class QuoteController {
  constructor(private readonly quotes: QuoteService) {}

  @Post()
  create(@Body() body: QuoteRequestInput) {
    return this.quotes.create(body);
  }
}

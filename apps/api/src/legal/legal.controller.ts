import { Controller, Get, Param } from "@nestjs/common";
import { LegalService } from "./legal.service";

@Controller("/api/:lang/legal")
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get("/:page")
  getLegalPage(@Param("lang") lang: string, @Param("page") page: string) {
    return this.legal.getPage({ lang, page });
  }
}

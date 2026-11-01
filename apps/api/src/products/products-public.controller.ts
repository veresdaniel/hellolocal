import { Controller, Get, Param, Query } from "@nestjs/common";
import { assertLang } from "../common/lang";
import { ProductsService } from "./products.service";

@Controller("/api/public/:lang/:siteKey/products")
export class ProductsPublicController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Param("lang") lang: string,
    @Param("siteKey") siteKey: string,
    @Query("category") category?: string,
    @Query("placeId") placeId?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    assertLang(lang);
    return this.products.listPublic({
      lang,
      siteKey,
      category,
      placeId,
      q,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}

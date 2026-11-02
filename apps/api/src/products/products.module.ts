import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { AuthModule } from "../auth/auth.module";
import { ProductsService } from "./products.service";
import { ProductsPublicController } from "./products-public.controller";
import { ProductsAdminController } from "./products-admin.controller";

@Module({
  imports: [PrismaModule, SiteModule, AuthModule],
  controllers: [ProductsPublicController, ProductsAdminController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

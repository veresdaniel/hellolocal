import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { CountryController } from "./country.controller";
import { CountryService } from "./country.service";

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), forwardRef(() => EntitlementsModule)],
  controllers: [CountryController],
  providers: [CountryService],
  exports: [CountryService],
})
export class CountryModule {}

import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CountryModule } from "../country/country.module";
import { SignupAbuseService } from "./signup-abuse.service";
import {
  AdminSignupSignalsController,
  FreeTrialCardController,
  PublicFreeTrialController,
} from "./signup-abuse.controller";

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), forwardRef(() => CountryModule)],
  controllers: [AdminSignupSignalsController, FreeTrialCardController, PublicFreeTrialController],
  providers: [SignupAbuseService],
  exports: [SignupAbuseService],
})
export class SignupAbuseModule {}

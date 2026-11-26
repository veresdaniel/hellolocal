import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { AppSettingsModule } from "../app-settings/app-settings.module";
import { AuthModule } from "../auth/auth.module";
import { AdminQuoteController, QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";

@Module({
  imports: [PrismaModule, EmailModule, AppSettingsModule, AuthModule],
  controllers: [QuoteController, AdminQuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}

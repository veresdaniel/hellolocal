import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { AppSettingsModule } from "../app-settings/app-settings.module";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";

@Module({
  imports: [PrismaModule, EmailModule, AppSettingsModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}

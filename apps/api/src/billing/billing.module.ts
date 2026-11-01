// apps/api/src/billing/billing.module.ts
import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { VisitorLadderModule } from "../visitor-ladder/visitor-ladder.module";

@Module({
  imports: [PrismaModule, AuthModule, VisitorLadderModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

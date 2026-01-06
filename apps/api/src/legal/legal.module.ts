import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { LegalController } from "./legal.controller";
import { LegalService } from "./legal.service";

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [LegalController],
  providers: [LegalService],
})
export class LegalModule {}

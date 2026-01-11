import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantModule } from "../tenant/tenant.module";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}

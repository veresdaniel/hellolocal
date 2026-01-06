import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantKeyResolverService } from "./tenant-key-resolver.service";

@Module({
  imports: [PrismaModule],
  providers: [TenantKeyResolverService],
  exports: [TenantKeyResolverService],
})
export class TenantModule {}
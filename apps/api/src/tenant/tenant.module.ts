import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteKeyResolverService } from "../site/site-key-resolver.service";

@Module({
  imports: [PrismaModule],
  providers: [SiteKeyResolverService],
  exports: [SiteKeyResolverService],
})
export class TenantModule {}
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteModule } from "../site/site.module";
import { LegalController } from "./legal.controller";
import { LegalPublicController } from "./legal-public.controller";
import { LegalService } from "./legal.service";

@Module({
  imports: [PrismaModule, SiteModule],
  controllers: [LegalController, LegalPublicController],
  providers: [LegalService],
})
export class LegalModule {}

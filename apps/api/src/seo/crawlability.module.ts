import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CrawlabilityService } from "./crawlability.service";

@Module({
  imports: [PrismaModule],
  providers: [CrawlabilityService],
  exports: [CrawlabilityService],
})
export class CrawlabilityModule {}

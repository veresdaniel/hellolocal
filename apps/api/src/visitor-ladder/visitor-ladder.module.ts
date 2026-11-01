import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { VisitorLadderService } from "./visitor-ladder.service";

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [VisitorLadderService],
  exports: [VisitorLadderService],
})
export class VisitorLadderModule {}

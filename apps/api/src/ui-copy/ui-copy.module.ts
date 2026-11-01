import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AdminUiCopyController, PublicUiCopyController } from "./ui-copy.controller";
import { UiCopyService } from "./ui-copy.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicUiCopyController, AdminUiCopyController],
  providers: [UiCopyService],
  exports: [UiCopyService],
})
export class UiCopyModule {}

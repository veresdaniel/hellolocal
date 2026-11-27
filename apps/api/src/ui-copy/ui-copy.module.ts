import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AdminUiCopyController, PublicUiCopyController } from "./ui-copy.controller";
import { UiCopyService } from "./ui-copy.service";
import { UiTranslateService } from "./ui-translate.service";
import { PathSegmentsModule } from "./path-segments.module";

@Module({
  imports: [PrismaModule, AuthModule, PathSegmentsModule],
  controllers: [PublicUiCopyController, AdminUiCopyController],
  providers: [UiCopyService, UiTranslateService],
  exports: [UiCopyService, PathSegmentsModule],
})
export class UiCopyModule {}

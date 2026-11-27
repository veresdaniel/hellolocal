import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SeoCrawlModule } from "../seo/seo-crawl.module";
import { AdminUiCopyController, PublicUiCopyController } from "./ui-copy.controller";
import { UiCopyService } from "./ui-copy.service";
import { UiTranslateService } from "./ui-translate.service";
import { PathSegmentsService } from "./path-segments.service";

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => SeoCrawlModule)],
  controllers: [PublicUiCopyController, AdminUiCopyController],
  providers: [UiCopyService, UiTranslateService, PathSegmentsService],
  exports: [UiCopyService, PathSegmentsService],
})
export class UiCopyModule {}

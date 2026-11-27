import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PathSegmentsService } from "./path-segments.service";

/**
 * Standalone so SeoCrawlModule can use path segments without importing UiCopyModule
 * (avoids SeoCrawl ↔ UiCopy circular module graph).
 */
@Module({
  imports: [PrismaModule],
  providers: [PathSegmentsService],
  exports: [PathSegmentsService],
})
export class PathSegmentsModule {}

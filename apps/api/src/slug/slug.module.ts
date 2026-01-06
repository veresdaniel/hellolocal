import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SlugResolverService } from "./slug-resolver.service";

@Module({
  imports: [PrismaModule],
  providers: [SlugResolverService],
  exports: [SlugResolverService],
})
export class SlugModule {}
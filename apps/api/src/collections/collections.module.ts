import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CollectionsService } from "./collections.service";
import { CollectionsPublicController } from "./collections-public.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CollectionsPublicController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}

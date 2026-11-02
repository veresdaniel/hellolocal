import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  UnderConstructionAdminController,
  UnderConstructionPublicController,
} from "./under-construction.controller";
import { UnderConstructionService } from "./under-construction.service";

@Module({
  imports: [PrismaModule],
  controllers: [UnderConstructionAdminController, UnderConstructionPublicController],
  providers: [UnderConstructionService],
  exports: [UnderConstructionService],
})
export class UnderConstructionModule {}

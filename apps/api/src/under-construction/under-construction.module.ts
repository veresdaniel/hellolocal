import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  UnderConstructionAdminController,
  UnderConstructionPublicController,
} from "./under-construction.controller";
import { UnderConstructionLockMiddleware } from "./under-construction-lock.middleware";
import { UnderConstructionService } from "./under-construction.service";

@Module({
  imports: [PrismaModule],
  controllers: [UnderConstructionAdminController, UnderConstructionPublicController],
  providers: [UnderConstructionService, UnderConstructionLockMiddleware],
  exports: [UnderConstructionService, UnderConstructionLockMiddleware],
})
export class UnderConstructionModule {}

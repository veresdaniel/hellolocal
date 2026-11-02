import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  UnderConstructionAdminController,
  UnderConstructionPublicController,
} from "./under-construction.controller";
import { UnderConstructionLockMiddleware } from "./under-construction-lock.middleware";
import { UnderConstructionService } from "./under-construction.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UnderConstructionAdminController, UnderConstructionPublicController],
  providers: [UnderConstructionService, UnderConstructionLockMiddleware],
  exports: [UnderConstructionService, UnderConstructionLockMiddleware],
})
export class UnderConstructionModule {}

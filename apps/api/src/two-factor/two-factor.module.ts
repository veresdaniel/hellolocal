import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { TwoFactorService } from "./two-factor.service";
import { TwoFactorController } from "./two-factor.controller";

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [TwoFactorService],
  controllers: [TwoFactorController],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}

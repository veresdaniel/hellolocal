// src/notifications/notifications.module.ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

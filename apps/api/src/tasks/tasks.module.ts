// apps/api/src/tasks/tasks.module.ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../prisma/prisma.module";
import { ExpiredFeaturedCleanupTask } from "./expired-featured-cleanup.task";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [ExpiredFeaturedCleanupTask],
})
export class TasksModule {}

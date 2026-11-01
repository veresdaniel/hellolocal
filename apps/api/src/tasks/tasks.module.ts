// apps/api/src/tasks/tasks.module.ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../prisma/prisma.module";
import { VisitorLadderModule } from "../visitor-ladder/visitor-ladder.module";
import { ExpiredFeaturedCleanupTask } from "./expired-featured-cleanup.task";
import { VisitorLadderTask } from "./visitor-ladder.task";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, VisitorLadderModule],
  providers: [ExpiredFeaturedCleanupTask, VisitorLadderTask],
})
export class TasksModule {}

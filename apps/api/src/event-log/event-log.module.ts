import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminEventLogService } from "../admin/admin-eventlog.service";

/**
 * EventLog Module
 * Separate module to avoid circular dependencies between AuthModule and AdminModule
 */
@Module({
  imports: [PrismaModule],
  providers: [AdminEventLogService],
  exports: [AdminEventLogService],
})
export class EventLogModule {}

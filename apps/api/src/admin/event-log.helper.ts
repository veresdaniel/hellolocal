// src/admin/event-log.helper.ts
import { AdminEventLogService } from "./admin-eventlog.service";

/**
 * Helper function to log admin actions
 * This should be called after successful create/update/delete operations
 */
export async function logAdminAction(
  eventLogService: AdminEventLogService | undefined,
  siteId: string,
  userId: string,
  action: "create" | "update" | "delete",
  entityType: string,
  entityId: string,
  description?: string,
  metadata?: any
): Promise<void> {
  if (!eventLogService) {
    return; // Service not available, skip logging
  }

  try {
    await eventLogService.create({
      siteId,
      userId,
      action,
      entityType,
      entityId,
      description: description || `${action} ${entityType} ${entityId}`,
      metadata,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("Failed to log admin action:", error);
  }
}

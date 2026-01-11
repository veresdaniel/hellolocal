import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";

export interface EventLogFilterDto {
  tenantId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  page?: number;
  limit?: number;
}

export interface CreateEventLogDto {
  tenantId: string;
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: any;
}

@Injectable()
export class AdminEventLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new event log entry
   */
  async create(dto: CreateEventLogDto) {
    console.log("[AdminEventLogService] Creating event log:", JSON.stringify(dto, null, 2));
    const result = await this.prisma.eventLog.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        action: dto.action,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        description: dto.description ?? null,
        metadata: dto.metadata ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });
    console.log("[AdminEventLogService] Event log created with ID:", result.id);
    return result;
  }

  /**
   * Find all event logs with filters
   * Only accessible to superadmin and admin
   */
  async findAll(userRole: UserRole, userTenantIds: string[], filters: EventLogFilterDto) {
    // Only superadmin and admin can access event logs
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can access event logs");
    }

    const where: any = {};

    // Filter by tenant - superadmin can see all, admin only their tenants
    if (userRole === UserRole.superadmin) {
      if (filters.tenantId) {
        where.tenantId = filters.tenantId;
      }
    } else {
      // Admin can only see logs from their tenants
      if (filters.tenantId && userTenantIds.includes(filters.tenantId)) {
        where.tenantId = filters.tenantId;
      } else {
        where.tenantId = { in: userTenantIds };
      }
    }

    // Filter by user
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Filter by action
    if (filters.action) {
      where.action = filters.action;
    }

    // Filter by entity type
    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Ensure page and limit are numbers
    const page = filters.page ? (typeof filters.page === 'string' ? parseInt(filters.page, 10) : filters.page) : 1;
    const limit = filters.limit ? (typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : filters.limit) : 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          tenant: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.eventLog.count({ where }),
    ]);

    console.log("[AdminEventLogService] findAll - where:", JSON.stringify(where, null, 2));
    console.log("[AdminEventLogService] findAll - found", logs.length, "logs, total:", total);
    console.log("[AdminEventLogService] findAll - first log:", logs[0] ? { id: logs[0].id, action: logs[0].action, createdAt: logs[0].createdAt } : "none");

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export event logs to CSV format
   */
  async exportToCsv(userRole: UserRole, userTenantIds: string[], filters: EventLogFilterDto): Promise<string> {
    // Only superadmin and admin can export event logs
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can export event logs");
    }

    const where: any = {};

    // Filter by tenant - superadmin can see all, admin only their tenants
    if (userRole === UserRole.superadmin) {
      if (filters.tenantId) {
        where.tenantId = filters.tenantId;
      }
    } else {
      // Admin can only see logs from their tenants
      if (filters.tenantId && userTenantIds.includes(filters.tenantId)) {
        where.tenantId = filters.tenantId;
      } else {
        where.tenantId = { in: userTenantIds };
      }
    }

    // Filter by user
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Filter by action
    if (filters.action) {
      where.action = filters.action;
    }

    // Filter by entity type
    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const logs = await this.prisma.eventLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    const headers = [
      "ID",
      "Timestamp",
      "Tenant",
      "User",
      "User Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "Description",
      "Metadata",
    ];

    const rows = logs.map((log: any) => [
      log.id,
      log.createdAt.toISOString(),
      log.tenant.slug,
      `${log.user.firstName} ${log.user.lastName}`,
      log.user.email,
      log.action,
      log.entityType ?? "",
      log.entityId ?? "",
      log.description ?? "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return csv;
  }

  /**
   * Delete event logs
   * Only accessible to superadmin
   */
  async delete(userRole: UserRole, userTenantIds: string[], filters: EventLogFilterDto) {
    // Only superadmin can delete event logs
    if (userRole !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can delete event logs");
    }

    const where: any = {};

    // Filter by tenant - superadmin can delete from any tenant, but we still need tenant filter
    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    } else {
      // If no tenant filter, use user's tenants (safety measure)
      if (userTenantIds.length > 0) {
        where.tenantId = { in: userTenantIds };
      } else {
        throw new BadRequestException("Cannot delete event logs: no tenant specified and user has no tenants");
      }
    }

    // Filter by user
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Filter by action
    if (filters.action) {
      where.action = filters.action;
    }

    // Filter by entity type
    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Log the final where clause
    console.log('[EventLogService] Final where clause for deletion:', JSON.stringify(where, null, 2));
    
    // Count total matching records (before applying any page/limit)
    const totalMatching = await this.prisma.eventLog.count({ where });
    console.log(`[EventLogService] Total matching records: ${totalMatching}`);
    
    // If no filters except tenant, don't allow deletion (safety measure)
    const hasSpecificFilters = !!(filters.userId || filters.action || filters.entityType || filters.startDate || filters.endDate);
    if (!hasSpecificFilters && totalMatching > 100) {
      throw new BadRequestException(`Cannot delete ${totalMatching} event logs without specific filters. Please add filters to narrow down the deletion.`);
    }

    // Log what we're about to delete
    console.log('[EventLogService] Deleting event logs with filters:', JSON.stringify(where, null, 2));
    
    // Count before deletion for verification
    const countBefore = await this.prisma.eventLog.count({ where });
    console.log(`[EventLogService] Found ${countBefore} event log(s) to delete`);

    const result = await this.prisma.eventLog.deleteMany({
      where,
    });

    console.log(`[EventLogService] Successfully deleted ${result.count} event log(s)`);

    // Verify deletion by counting remaining records
    const countAfter = await this.prisma.eventLog.count({ where });
    if (countAfter > 0) {
      console.warn(`[EventLogService] WARNING: ${countAfter} event log(s) still exist after deletion!`);
    } else {
      console.log(`[EventLogService] Verification: All matching event logs deleted successfully`);
    }

    return {
      message: `Deleted ${result.count} event log(s)`,
      count: result.count,
    };
  }

  /**
   * Get available filter options (actions, entity types, etc.)
   */
  async getFilterOptions(userRole: UserRole, userTenantIds: string[]) {
    // Only superadmin and admin can access filter options
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can access filter options");
    }

    const where: any = {};

    // Filter by tenant - superadmin can see all, admin only their tenants
    if (userRole === UserRole.admin) {
      where.tenantId = { in: userTenantIds };
    }

    const entityTypeWhere = {
      ...where,
      entityType: { not: null },
    };

    const [actions, entityTypes] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" },
      }),
      this.prisma.eventLog.findMany({
        where: entityTypeWhere,
        select: { entityType: true },
        distinct: ["entityType"],
        orderBy: { entityType: "asc" },
      }),
    ]);

    return {
      actions: actions.map((a: any) => a.action),
      entityTypes: entityTypes.map((e: any) => e.entityType).filter((et: any): et is string => et !== null),
    };
  }
}

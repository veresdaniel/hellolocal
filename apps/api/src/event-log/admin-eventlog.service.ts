import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface EventLogFilterDto {
  siteId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  page?: number;
  limit?: number;
  /** global is rejected for anyone who is not a superadmin. */
  scope?: string;
}

export interface CreateEventLogDto {
  siteId: string;
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
    const result = await this.prisma.eventLog.create({
      data: {
        siteId: dto.siteId,
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
        site: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });
    return result;
  }

  /**
   * Rows inside an already-scoped where. Callers must not pass a where wider than the actor.
   */
  async findWhere(accessWhere: Prisma.EventLogWhereInput, filters: EventLogFilterDto) {
    const and: Prisma.EventLogWhereInput[] = [accessWhere];
    if (filters.siteId) and.push({ siteId: filters.siteId });
    if (filters.userId) and.push({ userId: filters.userId });
    if (filters.action) and.push({ action: filters.action });
    if (filters.entityType) and.push({ entityType: filters.entityType });
    if (filters.startDate || filters.endDate) {
      and.push({
        createdAt: {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        },
      });
    }
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const where = { AND: and };
    const [logs, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
          site: { select: { id: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventLog.count({ where }),
    ]);
    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Find all event logs with filters
   * Only accessible to superadmin and admin
   */
  async findAll(userRole: UserRole, userSiteIds: string[], filters: EventLogFilterDto) {
    // Only superadmin and admin can access event logs
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can access event logs");
    }

    const where: any = {};

    // Filter by site - superadmin can see all, admin only their sites
    if (userRole === UserRole.superadmin) {
      if (filters.siteId) {
        where.siteId = filters.siteId;
      }
    } else {
      // Admin can only see logs from their sites
      if (filters.siteId && userSiteIds.includes(filters.siteId)) {
        where.siteId = filters.siteId;
      } else {
        where.siteId = { in: userSiteIds };
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
    const page = filters.page
      ? typeof filters.page === "string"
        ? parseInt(filters.page, 10)
        : filters.page
      : 1;
    const limit = filters.limit
      ? typeof filters.limit === "string"
        ? parseInt(filters.limit, 10)
        : filters.limit
      : 50;
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
          site: {
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
  async exportToCsv(
    userRole: UserRole,
    userSiteIds: string[],
    filters: EventLogFilterDto
  ): Promise<string> {
    // Only superadmin and admin can export event logs
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can export event logs");
    }

    const where: any = {};

    // Filter by site - superadmin can see all, admin only their sites
    if (userRole === UserRole.superadmin) {
      if (filters.siteId) {
        where.siteId = filters.siteId;
      }
    } else {
      // Admin can only see logs from their sites
      if (filters.siteId && userSiteIds.includes(filters.siteId)) {
        where.siteId = filters.siteId;
      } else {
        where.siteId = { in: userSiteIds };
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
        site: {
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
      "Site",
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
      log.site.slug,
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
      ...rows.map((row: any[]) =>
        row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csv;
  }

  /**
   * Delete event logs
   * Only accessible to superadmin
   */
  async delete(userRole: UserRole, userSiteIds: string[], filters: EventLogFilterDto) {
    // Only superadmin can delete event logs
    if (userRole !== UserRole.superadmin) {
      throw new ForbiddenException("Only superadmin can delete event logs");
    }

    const where: any = {};

    // Filter by site - superadmin can delete from any site, but we still need site filter
    if (filters.siteId) {
      where.siteId = filters.siteId;
    } else {
      // If no site filter, use user's sites (safety measure)
      if (userSiteIds.length > 0) {
        where.siteId = { in: userSiteIds };
      } else {
        throw new BadRequestException(
          "Cannot delete event logs: no site specified and user has no sites"
        );
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

    // Count total matching records (before applying any page/limit)
    const totalMatching = await this.prisma.eventLog.count({ where });

    // If no filters except site, don't allow deletion (safety measure)
    const hasSpecificFilters = !!(
      filters.userId ||
      filters.action ||
      filters.entityType ||
      filters.startDate ||
      filters.endDate
    );
    if (!hasSpecificFilters && totalMatching > 100) {
      throw new BadRequestException(
        `Cannot delete ${totalMatching} event logs without specific filters. Please add filters to narrow down the deletion.`
      );
    }

    // Count before deletion for verification
    const countBefore = await this.prisma.eventLog.count({ where });

    const result = await this.prisma.eventLog.deleteMany({
      where,
    });

    // Verify deletion by counting remaining records
    const countAfter = await this.prisma.eventLog.count({ where });

    return {
      message: `Deleted ${result.count} event log(s)`,
      count: result.count,
    };
  }

  /**
   * Get available filter options (actions, entity types, etc.)
   */
  async getFilterOptions(userRole: UserRole, userSiteIds: string[]) {
    // Only superadmin and admin can access filter options
    if (userRole !== UserRole.superadmin && userRole !== UserRole.admin) {
      throw new ForbiddenException("Only superadmin and admin can access filter options");
    }

    const where: any = {};

    // Filter by site - superadmin can see all, admin only their sites
    if (userRole === UserRole.admin) {
      where.siteId = { in: userSiteIds };
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
      entityTypes: entityTypes
        .map((e: any) => e.entityType)
        .filter((et: any): et is string => et !== null),
    };
  }
}

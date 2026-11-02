import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PlaceRole, PlaceSignupStatus, SiteRole, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../auth/rbac.service";
import { ensureRegionLink, removeRegionLink } from "./region-link";

export type AccessKind = "region" | "town" | "place";

export interface CreateAccessGrantDto {
  userId: string;
  kind: AccessKind;
  targetId: string;
  role?: string;
}

@Injectable()
export class AdminAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService
  ) {}

  async scope(userId: string) {
    const scope = await this.rbac.getContentScope(userId);
    const pending = await this.prisma.placeSignup.findFirst({
      where: { userId, status: PlaceSignupStatus.pending },
      select: { id: true },
    });
    return { ...scope, pendingSignup: Boolean(pending) };
  }

  private async actor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new ForbiddenException("User not found");
    return user;
  }

  async listGrants(actorId: string) {
    const actor = await this.actor(actorId);
    const scope = await this.rbac.getContentScope(actorId);
    const siteFilter = scope.unrestricted
      ? {}
      : {
          siteId: {
            in: actor.role === UserRole.admin ? scope.regionAdminSiteIds : scope.siteIds,
          },
        };

    const [regions, towns, places] = await Promise.all([
      this.prisma.siteMembership.findMany({
        where: siteFilter,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          site: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      actor.role === UserRole.superadmin
        ? this.prisma.townMembership.findMany({
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
              town: { select: { id: true, translations: { select: { lang: true, name: true } } } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      this.prisma.placeMembership.findMany({
        where: scope.unrestricted
          ? {}
          : actor.role === UserRole.admin
            ? { place: this.rbac.adminMembershipPlaceWhere(scope) }
            : { place: { siteId: { in: scope.siteIds } } },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          place: {
            select: { id: true, translations: { select: { lang: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return [
      ...regions.map((row) => ({
        id: row.id,
        kind: "region" as const,
        role: row.role,
        user: row.user,
        targetId: row.siteId,
        targetName:
          row.site.translations.find((t) => t.lang === "hu")?.name || row.site.slug,
      })),
      ...towns.map((row) => ({
        id: row.id,
        kind: "town" as const,
        role: row.role,
        user: row.user,
        targetId: row.townId,
        targetName: row.town.translations.find((t) => t.lang === "hu")?.name || row.townId,
      })),
      ...places.map((row) => ({
        id: row.id,
        kind: "place" as const,
        role: row.role,
        user: row.user,
        targetId: row.placeId,
        targetName: row.place.translations.find((t) => t.lang === "hu")?.name || row.placeId,
      })),
    ];
  }

  async createGrant(actorId: string, dto: CreateAccessGrantDto) {
    const actor = await this.actor(actorId);
    if (!dto.userId || !dto.targetId || !dto.kind) {
      throw new BadRequestException("userId, kind and targetId are required");
    }
    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!targetUser) throw new NotFoundException("User not found");

    if (dto.kind === "town") {
      if (actor.role !== UserRole.superadmin) {
        throw new ForbiddenException("Only a superadmin can assign town users");
      }
      const town = await this.prisma.town.findUnique({ where: { id: dto.targetId } });
      if (!town) throw new NotFoundException("Town not found");
      if (!town.siteId) {
        throw new BadRequestException("Településadmin csak régióhoz kötött településhez adható.");
      }
      const existing = await this.prisma.townMembership.findUnique({
        where: { townId_userId: { townId: dto.targetId, userId: dto.userId } },
      });
      if (existing) return existing;
      return this.prisma.townMembership.create({
        data: { townId: dto.targetId, userId: dto.userId, role: "editor" },
      });
    }

    if (dto.kind === "region") {
      if (actor.role !== UserRole.superadmin) {
        throw new ForbiddenException("Only a superadmin can assign region users");
      }
      const role = dto.role === "siteadmin" ? SiteRole.siteadmin : SiteRole.editor;
      const existing = await this.prisma.siteMembership.findUnique({
        where: { siteId_userId: { siteId: dto.targetId, userId: dto.userId } },
      });
      if (existing) {
        await ensureRegionLink(this.prisma, dto.userId, dto.targetId);
        return existing;
      }
      const created = await this.prisma.siteMembership.create({
        data: { siteId: dto.targetId, userId: dto.userId, role },
      });
      await ensureRegionLink(this.prisma, dto.userId, dto.targetId);
      return created;
    }

    const place = await this.prisma.place.findUnique({
      where: { id: dto.targetId },
      select: { id: true, siteId: true },
    });
    if (!place) throw new NotFoundException("Place not found");
    await this.assertRegionManager(actor.role, actorId, place.siteId);
    const role =
      dto.role === "owner"
        ? PlaceRole.owner
        : dto.role === "manager"
          ? PlaceRole.manager
          : PlaceRole.editor;
    const existing = await this.prisma.placeMembership.findUnique({
      where: { placeId_userId: { placeId: dto.targetId, userId: dto.userId } },
    });
    if (existing) return existing;
    return this.prisma.placeMembership.create({
      data: { placeId: dto.targetId, userId: dto.userId, role },
    });
  }

  async deleteGrant(actorId: string, kind: AccessKind, id: string) {
    const actor = await this.actor(actorId);
    if (kind === "town") {
      if (actor.role !== UserRole.superadmin) {
        throw new ForbiddenException("Only a superadmin can remove town users");
      }
      await this.prisma.townMembership.delete({ where: { id } });
      return { ok: true };
    }
    if (kind === "region") {
      const row = await this.prisma.siteMembership.findUnique({ where: { id } });
      if (!row) throw new NotFoundException("Grant not found");
      await this.assertRegionManager(actor.role, actorId, row.siteId);
      await removeRegionLink(this.prisma, row.userId, row.siteId);
      return { ok: true };
    }
    const row = await this.prisma.placeMembership.findUnique({
      where: { id },
      include: { place: { select: { siteId: true } } },
    });
    if (!row) throw new NotFoundException("Grant not found");
    await this.assertRegionManager(actor.role, actorId, row.place.siteId);
    await this.prisma.placeMembership.delete({ where: { id } });
    return { ok: true };
  }

  async listTownMembers(actorId: string, townId: string) {
    const actor = await this.actor(actorId);
    if (actor.role !== UserRole.superadmin) {
      throw new ForbiddenException("Only a superadmin can manage town users");
    }
    await this.rbac.requireTown(actorId, townId);
    return this.prisma.townMembership.findMany({
      where: { townId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async assertRegionManager(role: UserRole, actorId: string, siteId: string) {
    if (role === UserRole.superadmin) return;
    const membership = await this.prisma.siteMembership.findUnique({
      where: { siteId_userId: { siteId, userId: actorId } },
    });
    if (!membership || membership.role !== SiteRole.siteadmin) {
      throw new ForbiddenException("Only a superadmin or region admin can change this access");
    }
  }
}

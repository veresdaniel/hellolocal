import { SiteRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** UserSite and SiteMembership are the same region link. Keep both rows together. */
export async function ensureRegionLink(prisma: PrismaService, userId: string, siteId: string) {
  const link = await prisma.userSite.findUnique({
    where: { userId_siteId: { userId, siteId } },
  });
  if (!link) {
    const count = await prisma.userSite.count({ where: { userId } });
    await prisma.userSite.create({
      data: { userId, siteId, isPrimary: count === 0 },
    });
  }
  const membership = await prisma.siteMembership.findUnique({
    where: { siteId_userId: { siteId, userId } },
  });
  if (!membership) {
    await prisma.siteMembership.create({
      data: { userId, siteId, role: SiteRole.editor },
    });
  }
}

export async function removeRegionLink(prisma: PrismaService, userId: string, siteId: string) {
  await prisma.userSite.deleteMany({ where: { userId, siteId } });
  await prisma.siteMembership.deleteMany({ where: { userId, siteId } });
}

/** The saved region list is the only list. Both tables follow it. */
export async function replaceRegionLinks(prisma: PrismaService, userId: string, siteIds: string[]) {
  const [links, memberships] = await Promise.all([
    prisma.userSite.findMany({ where: { userId }, select: { siteId: true } }),
    prisma.siteMembership.findMany({ where: { userId }, select: { siteId: true } }),
  ]);
  const current = new Set([
    ...links.map((row) => row.siteId),
    ...memberships.map((row) => row.siteId),
  ]);
  const next = new Set(siteIds);
  for (const siteId of next) {
    await ensureRegionLink(prisma, userId, siteId);
  }
  for (const siteId of current) {
    if (!next.has(siteId)) await removeRegionLink(prisma, userId, siteId);
  }
}

/**
 * After a paid place plan is applied / subscription returns to ACTIVE,
 * clear owner suspension and (optionally) publish the place again.
 */
import { PlacePlan, PrismaClient, SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | PrismaClient;

export function isPaidPlacePlan(plan: PlacePlan | SubscriptionPlan | string | null | undefined): boolean {
  const value = String(plan || "").toUpperCase();
  return value === "BASIC" || value === "PRO" || value === "BUSINESS" || value === "MUNICIPAL";
}

export function subscriptionPlanToPlacePlan(plan: SubscriptionPlan | string): PlacePlan {
  const value = String(plan).toUpperCase();
  if (value === "PRO") return PlacePlan.pro;
  if (value === "BASIC") return PlacePlan.basic;
  return PlacePlan.free;
}

/**
 * Unsuspend the place owner and mark subscription ACTIVE.
 * When `activatePlace` is true (paid plans), also set `place.isActive = true`.
 */
export async function reactivatePlaceAfterPaidAccess(
  prisma: Db,
  placeId: string,
  options?: { activatePlace?: boolean }
): Promise<void> {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, ownerId: true },
  });
  if (!place) return;

  const now = new Date();
  if (place.ownerId) {
    await prisma.user.updateMany({
      where: {
        id: place.ownerId,
        isActive: false,
        role: { not: UserRole.superadmin },
      },
      data: { isActive: true },
    });
  }

  await prisma.placeSubscription.updateMany({
    where: {
      placeId,
      status: { in: [SubscriptionStatus.SUSPENDED, SubscriptionStatus.EXPIRED] },
    },
    data: {
      status: SubscriptionStatus.ACTIVE,
      statusChangedAt: now,
    },
  });

  if (options?.activatePlace) {
    await prisma.place.update({
      where: { id: placeId },
      data: { isActive: true },
    });
  }
}

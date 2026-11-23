/**
 * Public visibility of place/event content vs the owning user account.
 * Suspended (isActive=false) owners hide content on list/map/detail.
 * Superadmin-owned content is never hidden by account suspension.
 */
import { Prisma, UserRole } from "@prisma/client";

/** Prisma `Place` filter: owner missing, active, or superadmin. */
export function placeOwnerPubliclyVisible(): Prisma.PlaceWhereInput {
  return {
    OR: [
      { ownerId: null },
      { owner: { isActive: true } },
      { owner: { role: UserRole.superadmin } },
    ],
  };
}

/** Nest under `place: { ... }` for public event queries. */
export function eventPlaceOwnerPubliclyVisible(): Prisma.EventWhereInput {
  return {
    place: {
      isActive: true,
      ...placeOwnerPubliclyVisible(),
    },
  };
}

export function isOwnerAccountPubliclyVisible(
  owner: { isActive: boolean; role: UserRole | string } | null | undefined
): boolean {
  if (!owner) return true;
  if (owner.role === UserRole.superadmin) return true;
  return owner.isActive === true;
}

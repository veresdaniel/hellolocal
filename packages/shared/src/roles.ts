/** Cross-app role lists — keep aligned with Prisma enums. */

export const USER_ROLES = ["superadmin", "admin", "editor", "viewer"] as const;
export type UserRoleId = (typeof USER_ROLES)[number];

export const SITE_ROLES = ["siteadmin", "editor", "viewer"] as const;
export type SiteRoleId = (typeof SITE_ROLES)[number];

export const PLACE_ROLES = ["owner", "manager", "editor"] as const;
export type PlaceRoleId = (typeof PLACE_ROLES)[number];

export const USER_ROLE_HIERARCHY: Record<UserRoleId, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  superadmin: 4,
};

export const SITE_ROLE_HIERARCHY: Record<SiteRoleId, number> = {
  viewer: 1,
  editor: 2,
  siteadmin: 3,
};

export const ROLE_VIEWER: UserRoleId = "viewer";
export const ROLE_EDITOR: UserRoleId = "editor";
export const ROLE_ADMIN: UserRoleId = "admin";
export const ROLE_SUPERADMIN: UserRoleId = "superadmin";

export const SITE_ROLE_VIEWER: SiteRoleId = "viewer";
export const SITE_ROLE_EDITOR: SiteRoleId = "editor";
export const SITE_ROLE_SITEADMIN: SiteRoleId = "siteadmin";

export function isUserRole(value: string): value is UserRoleId {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function isSiteRole(value: string): value is SiteRoleId {
  return (SITE_ROLES as readonly string[]).includes(value);
}

/**
 * Role checking and permission helpers
 * Centralizes role hierarchy and permission logic
 */

import type { UserRole, SiteRole } from "../types/enums";
import { USER_ROLE_HIERARCHY, SITE_ROLE_HIERARCHY, ROLE_ADMIN, ROLE_SUPERADMIN, ROLE_EDITOR, SITE_ROLE_SITEADMIN, SITE_ROLE_EDITOR } from "../types/enums";

/**
 * Check if user role has required permission level
 */
export function hasUserRolePermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return USER_ROLE_HIERARCHY[userRole] >= USER_ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if site role has required permission level
 */
export function hasSiteRolePermission(
  siteRole: SiteRole,
  requiredRole: SiteRole
): boolean {
  return SITE_ROLE_HIERARCHY[siteRole] >= SITE_ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(role: string | UserRole): boolean {
  return role === ROLE_SUPERADMIN;
}

/**
 * Check if user is admin (global or site-level)
 */
export function isAdmin(userRole: UserRole, siteRole?: SiteRole | null): boolean {
  return userRole === ROLE_ADMIN || userRole === ROLE_SUPERADMIN || siteRole === SITE_ROLE_SITEADMIN;
}

/**
 * Check if user can edit (editor or higher)
 */
export function canEdit(userRole: UserRole, siteRole?: SiteRole | null): boolean {
  return (
    userRole === ROLE_EDITOR ||
    userRole === ROLE_ADMIN ||
    userRole === ROLE_SUPERADMIN ||
    siteRole === SITE_ROLE_EDITOR ||
    siteRole === SITE_ROLE_SITEADMIN
  );
}

/**
 * Check if user can view (any role)
 */
export function canView(userRole: UserRole, siteRole?: SiteRole | null): boolean {
  return true; // All authenticated users can view
}

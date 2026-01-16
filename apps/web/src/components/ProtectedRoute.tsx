// src/components/ProtectedRoute.tsx
import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useAdminSite } from "../contexts/AdminSiteContext";
import { getSiteMemberships } from "../api/admin.api";
import { isTokenExpired } from "../utils/tokenUtils";
import { LoadingSpinner } from "./LoadingSpinner";
import { DEFAULT_LANG, APP_LANGS, type Lang } from "../app/config";
import { isSuperadmin, isAdmin } from "../utils/roleHelpers";
import { USER_ROLE_HIERARCHY, ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_EDITOR } from "../types/enums";
import type { UserRole } from "../types/enums";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  considerSiteRole?: boolean; // If true, also check site-level role (siteadmin)
}

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ProtectedRoute({
  children,
  requiredRole,
  considerSiteRole = false,
}: ProtectedRouteProps) {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY EARLY RETURNS
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  const { selectedSiteId } = useAdminSite();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [isCheckingSiteRole, setIsCheckingSiteRole] = useState(false);

  // Check for tokens immediately (before waiting for AuthContext)
  const [shouldRedirect, setShouldRedirect] = useState(() => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshTokenValue = localStorage.getItem("refreshToken");

    // If no tokens at all, redirect immediately
    if (!accessToken && !refreshTokenValue) {
      return true;
    }

    // If access token is expired
    if (accessToken && isTokenExpired(accessToken)) {
      // If refresh token is also expired or missing, redirect immediately
      if (!refreshTokenValue || isTokenExpired(refreshTokenValue)) {
        return true;
      }
    }

    return false;
  });

  // Get user and isLoading from authContext (may be undefined)
  const user = authContext?.user ?? null;
  const isLoading = authContext?.isLoading ?? false;

  // Check site-level role if considerSiteRole is enabled
  useEffect(() => {
    const checkSiteAdminRole = async () => {
      if (!considerSiteRole || !selectedSiteId || !user) {
        setIsSiteAdmin(false);
        setIsCheckingSiteRole(false);
        return;
      }

      setIsCheckingSiteRole(true);
      try {
        const memberships = await getSiteMemberships(selectedSiteId, user.id);
        const membership = memberships.find(
          (m) => m.siteId === selectedSiteId && m.userId === user.id
        );
        setIsSiteAdmin(membership?.role === "siteadmin" || false);
      } catch (err) {
        console.error("Failed to check site admin role", err);
        setIsSiteAdmin(false);
      } finally {
        setIsCheckingSiteRole(false);
      }
    };

    checkSiteAdminRole();
  }, [considerSiteRole, selectedSiteId, user?.id]);

  // Check token expiration on mount and periodically
  useEffect(() => {
    const checkSession = () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshTokenValue = localStorage.getItem("refreshToken");

      // If no tokens at all, redirect to login
      if (!accessToken && !refreshTokenValue) {
        setShouldRedirect(true);
        return;
      }

      // If access token is expired
      if (accessToken && isTokenExpired(accessToken)) {
        // If refresh token is also expired or missing, redirect to login
        if (!refreshTokenValue || isTokenExpired(refreshTokenValue)) {
          setShouldRedirect(true);
          return;
        }
        // If refresh token is still valid, don't redirect yet
        // AuthContext will try to refresh the access token
        setShouldRedirect(false);
        return;
      }

      // If we have a valid access token, don't redirect
      setShouldRedirect(false);
    };

    // Check immediately
    checkSession();

    // Check every 10 seconds
    const interval = setInterval(checkSession, 10000);

    return () => clearInterval(interval);
  }, []);

  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS HAVE BEEN CALLED

  // If we should redirect (no tokens or expired tokens), redirect immediately
  // Don't wait for AuthContext to load
  if (shouldRedirect) {
    return <Navigate to={`/${lang}/admin/login`} replace />;
  }

  if (!authContext) {
    // If AuthContext is not available, check tokens again
    // If no tokens, redirect immediately
    const accessToken = localStorage.getItem("accessToken");
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!accessToken && !refreshTokenValue) {
      return <Navigate to={`/${lang}/admin/login`} replace />;
    }
    // If tokens exist but expired, check if refresh token is also expired
    if (accessToken && isTokenExpired(accessToken)) {
      if (!refreshTokenValue || isTokenExpired(refreshTokenValue)) {
        return <Navigate to={`/${lang}/admin/login`} replace />;
      }
    }
    // Wait a bit for AuthContext to load if tokens might be valid
    return <LoadingSpinner isLoading={true} delay={0} />;
  }

  // Wait for AuthContext to finish loading before checking user
  // This prevents blocking lazy-loaded modules
  if (isLoading || (considerSiteRole && isCheckingSiteRole)) {
    // But check tokens again while loading - if no tokens, redirect immediately
    const accessToken = localStorage.getItem("accessToken");
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!accessToken && !refreshTokenValue) {
      return <Navigate to={`/${lang}/admin/login`} replace />;
    }
    // If tokens exist but expired, check if refresh token is also expired
    if (accessToken && isTokenExpired(accessToken)) {
      if (!refreshTokenValue || isTokenExpired(refreshTokenValue)) {
        return <Navigate to={`/${lang}/admin/login`} replace />;
      }
    }
    return <LoadingSpinner isLoading={isLoading || isCheckingSiteRole} delay={0} />;
  }

  // Redirect to login if no user (after loading is complete)
  if (!user) {
    return <Navigate to={`/${lang}/admin/login`} replace />;
  }

  // Check if user is a visitor (activeSiteId === null)
  // Visitors should not access admin routes (except login/register)
  // BUT: superadmin, admin, and editor have access to everything, even without activeSiteId
  const userIsSuperadmin = isSuperadmin(user.role);
  const userIsAdmin = user.role === ROLE_ADMIN;
  const userIsEditor = user.role === ROLE_EDITOR;
  const hasAdminAccess = userIsSuperadmin || userIsAdmin || userIsEditor;
  const isVisitor =
    !hasAdminAccess && (user.activeSiteId === null || user.activeSiteId === undefined);
  if (isVisitor) {
    // Redirect visitor to public pages (home page)
    return <Navigate to={`/${lang}`} replace />;
  }

  // Check if user is a viewer - viewers should not access admin routes at all
  // BUT: if user has activeSiteId (not a visitor), they can access admin even as viewer
  // This allows users who activated free plan to access admin dashboard
  // Only block viewers who are still visitors (no activeSiteId)
  // Note: This is handled by the isVisitor check above, so viewers with activeSiteId can proceed

  if (requiredRole) {
    const userRoleLevel = USER_ROLE_HIERARCHY[user.role as UserRole] || 0;
    const requiredRoleLevel = USER_ROLE_HIERARCHY[requiredRole as UserRole] || 0;

    // Superadmin has access to everything
    if (userIsSuperadmin) {
      return <>{children}</>;
    }

    // Effective admin permissions: global admin OR siteadmin (if considerSiteRole is enabled)
    const hasAdminPermissions = isAdmin(
      user.role as UserRole,
      isSiteAdmin ? "siteadmin" : undefined
    );

    // Admin (global or site-level) has access to everything except superadmin-only routes
    if (hasAdminPermissions && requiredRole !== ROLE_SUPERADMIN) {
      return <>{children}</>;
    }

    // For editor/viewer roles, check if site-level role elevates permissions
    // Siteadmin can access admin-level routes (except superadmin-only)
    if (considerSiteRole && isSiteAdmin && requiredRole === ROLE_ADMIN) {
      return <>{children}</>;
    }

    if (userRoleLevel < requiredRoleLevel) {
      return <div style={{ padding: 24 }}>Access denied. Required role: {requiredRole}</div>;
    }
  }

  return <>{children}</>;
}

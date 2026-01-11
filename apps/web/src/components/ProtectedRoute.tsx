// src/components/ProtectedRoute.tsx
import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { isTokenExpired } from "../utils/tokenUtils";
import { LoadingSpinner } from "./LoadingSpinner";
import { DEFAULT_LANG, APP_LANGS, type Lang } from "../app/config";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "superadmin" | "admin" | "editor" | "viewer";
}

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
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
  
  if (!authContext) {
    // If AuthContext is not available, wait a bit before redirecting
    // This allows lazy-loaded modules to start loading
    return <LoadingSpinner isLoading={true} delay={0} />;
  }
  
  const { user, isLoading } = authContext;

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

  // Wait for AuthContext to finish loading before redirecting
  // This prevents blocking lazy-loaded modules
  if (isLoading) {
    return <LoadingSpinner isLoading={isLoading} delay={0} />;
  }

  // Redirect to login if no tokens or no user (after loading is complete)
  if (shouldRedirect || !user) {
    return <Navigate to={`/${lang}/admin/login`} replace />;
  }

  if (requiredRole) {
    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      editor: 2,
      admin: 3,
      superadmin: 4,
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    // Superadmin has access to everything
    if (user.role === "superadmin") {
      return <>{children}</>;
    }
    
    // Admin has access to everything except superadmin-only routes
    if (user.role === "admin" && requiredRole !== "superadmin") {
      return <>{children}</>;
    }

    if (userRoleLevel < requiredRoleLevel) {
      return <div style={{ padding: 24 }}>Access denied. Required role: {requiredRole}</div>;
    }
  }

  return <>{children}</>;
}


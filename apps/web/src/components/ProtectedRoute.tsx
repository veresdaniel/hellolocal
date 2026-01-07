// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { isTokenExpired } from "../utils/tokenUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "superadmin" | "admin" | "editor" | "viewer";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

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

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  // Redirect to login if no user or session expired
  if (!user || shouldRedirect) {
    return <Navigate to="/admin/login" replace />;
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


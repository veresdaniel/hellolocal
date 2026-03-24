// src/contexts/AuthContext.tsx
import { useEffect, ReactNode } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext.shared";
import { useAuthStore } from "../stores/authStore";
import { TIMING } from "../app/config";
import { SessionExpirationModal } from "../components/SessionExpirationModal";
import { getTokenExpiration } from "../utils/tokenUtils";

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isLoading,
    showSessionModal,
    login,
    register,
    logout,
    refreshUser,
    loadUserFromStorage,
    setShowSessionModal,
    refreshTokenIfNeeded,
  } = useAuthStore();

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // Check if session is expiring soon and show modal
  useEffect(() => {
    const checkSessionExpiring = () => {
      const currentPath = window.location.pathname;
      const isPublicPage =
        currentPath.startsWith("/admin/login") ||
        currentPath.startsWith("/admin/register") ||
        currentPath.startsWith("/admin/forgot-password") ||
        currentPath.startsWith("/admin/reset-password") ||
        !currentPath.startsWith("/admin");

      if (isPublicPage || !user) {
        setShowSessionModal(false);
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setShowSessionModal(false);
        return;
      }

      const expirationTime = getTokenExpiration(accessToken);
      if (!expirationTime) {
        setShowSessionModal(false);
        return;
      }

      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;
      const thirtySeconds = 30 * 1000; // 30 seconds

      // Show modal if token expires in less than 30 seconds
      if (timeUntilExpiry < thirtySeconds && timeUntilExpiry > 0) {
        setShowSessionModal(true);
      } else {
        setShowSessionModal(false);
      }
    };

    // Check immediately
    checkSessionExpiring();

    // Check every second for accurate timing
    const interval = setInterval(checkSessionExpiring, TIMING.SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, setShowSessionModal]);

  // Proactive token refresh on user activity
  useEffect(() => {
    let lastActivityTime = Date.now();
    let isRefreshing = false;

    const handleActivity = async () => {
      const now = Date.now();
      // Only refresh if at least 1 minute has passed since last activity
      if (now - lastActivityTime > 60000) {
        lastActivityTime = now;

        const currentPath = window.location.pathname;
        const isPublicPage =
          currentPath.startsWith("/admin/login") ||
          currentPath.startsWith("/admin/register") ||
          currentPath.startsWith("/admin/forgot-password") ||
          currentPath.startsWith("/admin/reset-password") ||
          !currentPath.startsWith("/admin");

        if (isPublicPage || isRefreshing) {
          return;
        }

        isRefreshing = true;
        try {
          await refreshTokenIfNeeded();
        } finally {
          isRefreshing = false;
        }
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [refreshTokenIfNeeded]);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {showSessionModal && (
        <SessionExpirationModal
          onExtend={() => setShowSessionModal(false)}
          onDismiss={() => setShowSessionModal(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

// Re-export for backward compatibility
export { AuthContext, type AuthContextType } from "./AuthContext.shared";
export { useAuth } from "./useAuth";

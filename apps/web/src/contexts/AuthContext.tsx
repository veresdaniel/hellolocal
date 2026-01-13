// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { User } from "../api/auth.api";
import { login, register, logout as apiLogout, refreshToken } from "../api/auth.api";
import { isTokenExpired, getTokenExpiration } from "../utils/tokenUtils";
import { DEFAULT_LANG, APP_LANGS, type Lang } from "../app/config";
import { SessionExtensionToast } from "../components/SessionExtensionToast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, twoFactorToken?: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    bio?: string;
  }) => Promise<void>;
  logout: (isManualLogout?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionToast, setShowSessionToast] = useState(false);

  // Helper function to extract language code from URL or localStorage
  const getLanguageCode = (): Lang => {
    const currentPath = window.location.pathname;
    // Try to extract lang from URL (e.g., /hu/admin or /en/admin)
    const pathMatch = currentPath.match(/^\/(hu|en|de)(\/|$)/);
    if (pathMatch && APP_LANGS.includes(pathMatch[1] as Lang)) {
      return pathMatch[1] as Lang;
    }
    // Fallback to localStorage i18nextLng
    const storedLang = localStorage.getItem("i18nextLng");
    if (storedLang && APP_LANGS.includes(storedLang as Lang)) {
      return storedLang as Lang;
    }
    // Final fallback to default
    return DEFAULT_LANG;
  };

  const handleLogout = useCallback(async (isManualLogout: boolean = false) => {
    try {
      await apiLogout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("adminSelectedTenantId");
      setUser(null);
      setShowSessionToast(false); // Hide toast on logout
      
      const currentPath = window.location.pathname;
      const lang = getLanguageCode();
      
      // Skip redirect if already on the target page
      if (isManualLogout) {
        // Manual logout from admin: redirect to admin login with current language
        const logoutLang = localStorage.getItem("logoutRedirectLang") || lang;
        localStorage.removeItem("logoutRedirectLang");
        sessionStorage.setItem("wasManualLogout", "true"); // Use sessionStorage instead of localStorage
        
        if (currentPath === `/${logoutLang}/admin/login` || currentPath === `/${logoutLang}/admin/login/`) {
          return;
        }
        // Redirect to admin login page
        window.location.href = `/${logoutLang}/admin/login`;
      } else {
        // Automatic logout (session expired): only redirect if we're in admin area
        const isInAdminArea = currentPath.includes('/admin') && !currentPath.includes('/admin/login');
        
        if (!isInAdminArea) {
          // Not in admin area, don't redirect to login
          return;
        }
        
        if (currentPath.startsWith(`/${lang}/admin/login`)) {
          return;
        }
        // Redirect to admin login only if session expired while in admin
        sessionStorage.setItem("sessionExpired", "true");
        window.location.href = `/${lang}/admin/login`;
      }
    }
  }, []);

  // Check token expiration periodically and handle logout event
  useEffect(() => {
    let hasInitialCheckRun = false; // Track if initial check has run
    
    const checkTokenExpiration = () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshTokenValue = localStorage.getItem("refreshToken");

      // Skip check if we're on a public page (login, register, etc.)
      const currentPath = window.location.pathname;
      const isPublicPage = 
        currentPath.startsWith("/admin/login") ||
        currentPath.startsWith("/admin/register") ||
        currentPath.startsWith("/admin/forgot-password") ||
        currentPath.startsWith("/admin/reset-password") ||
        !currentPath.startsWith("/admin");

      if (isPublicPage) {
        return; // Don't check token expiration on public pages
      }

      if (!accessToken && !refreshTokenValue) {
        // No tokens, ensure user is logged out
        if (user) {
          handleLogout(false); // Automatic logout
        } else if (hasInitialCheckRun) {
          // Only redirect if this is NOT the initial load
          // On initial load without tokens, don't redirect
          return;
        }
        return;
      }

      // If access token is expired, try to refresh
      if (accessToken && isTokenExpired(accessToken)) {
        if (refreshTokenValue && !isTokenExpired(refreshTokenValue)) {
          // Try to refresh access token
          refreshToken({ refreshToken: refreshTokenValue })
            .then((data) => {
              localStorage.setItem("accessToken", data.accessToken);
              localStorage.setItem("refreshToken", data.refreshToken);
            })
            .catch(() => {
              // Refresh failed, logout
              handleLogout(false); // Automatic logout
            });
        } else {
          // Both tokens expired, logout
          handleLogout(false); // Automatic logout
        }
      }
      
      hasInitialCheckRun = true;
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 10 seconds (more frequent for better responsiveness)
    const interval = setInterval(checkTokenExpiration, 10000);

    // Listen for logout event from API client
    const handleLogoutEvent = () => {
      handleLogout(false); // Automatic logout
    };
    window.addEventListener("auth:logout", handleLogoutEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [user, handleLogout]);

  // Check if session is expiring soon (30 seconds before expiration) and show toast
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
        setShowSessionToast(false);
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setShowSessionToast(false);
        return;
      }

      const expirationTime = getTokenExpiration(accessToken);
      if (!expirationTime) {
        setShowSessionToast(false);
        return;
      }

      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;
      const thirtySeconds = 30 * 1000; // 30 seconds = 0.5 minutes

      // Show toast if token expires in less than 30 seconds
      if (timeUntilExpiry < thirtySeconds && timeUntilExpiry > 0) {
        setShowSessionToast(true);
      } else {
        setShowSessionToast(false);
      }
    };

    // Check immediately
    checkSessionExpiring();

    // Check every second for accurate timing
    const interval = setInterval(checkSessionExpiring, 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Proactive session extension on user interaction
  useEffect(() => {
    let lastActivityTime = Date.now();
    let isRefreshing = false;

    const refreshSessionOnActivity = async () => {
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

      const accessToken = localStorage.getItem("accessToken");
      const refreshTokenValue = localStorage.getItem("refreshToken");

      if (!accessToken || !refreshTokenValue) {
        return;
      }

      // Check if token is close to expiration (within 5 minutes)
      // This allows proactive refresh before expiration
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const fiveMinutes = 5 * 60 * 1000;

        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
          isRefreshing = true;
          try {
            const data = await refreshToken({ refreshToken: refreshTokenValue });
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            // Hide toast after successful refresh
            setShowSessionToast(false);
          } catch (error) {
            console.error("[Auth] Failed to refresh session on activity", error);
            // Don't logout here, let the normal expiration check handle it
          } finally {
            isRefreshing = false;
          }
        }
      } catch (error) {
        // Invalid token format, ignore
        console.error("[Auth] Invalid token format", error);
      }
    };

    const handleActivity = () => {
      const now = Date.now();
      // Only refresh if at least 1 minute has passed since last activity
      if (now - lastActivityTime > 60000) {
        lastActivityTime = now;
        refreshSessionOnActivity();
      }
    };

    // Listen to user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Function to load user from localStorage and refresh from API
  const loadUserFromStorage = useCallback(async () => {
    setIsLoading(true);
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure role is lowercase
        if (parsedUser.role) {
          parsedUser.role = parsedUser.role.toLowerCase();
        }
        // Set user immediately from localStorage (synchronous update for immediate UI feedback)
        // This ensures the UI updates immediately even before API call completes
        // Always update to ensure React re-renders when user data changes
        setUser(parsedUser);
        
        // Refresh user data from API to ensure it's up to date (especially role)
        if (storedToken) {
          // Get API base URL from environment variable or use relative path for development
          const apiUrl = import.meta.env.VITE_API_URL;
          const apiBaseUrl = apiUrl ? apiUrl.replace(/\/$/, "") : "";
          fetch(`${apiBaseUrl}/api/admin/users/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              Accept: "application/json",
            },
          })
            .then((res) => {
              if (res.ok) {
                return res.json();
              }
              // If 401, token is invalid - clear everything
              if (res.status === 401) {
                localStorage.removeItem("user");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                setUser(null);
                throw new Error("Unauthorized - session expired");
              }
              throw new Error("Failed to fetch user");
            })
            .then((freshUser) => {
              // Update with fresh data from API - ensure role is lowercase
              const role = (freshUser.role || "").toLowerCase() as User["role"];
              const userData = {
                ...freshUser,
                role,
                siteIds: freshUser.siteIds || [],
              };
              localStorage.setItem("user", JSON.stringify(userData));
              
              // Only update user state if data actually changed (prevent unnecessary re-renders)
              setUser((prevUser) => {
                if (!prevUser || 
                    prevUser.id !== userData.id || 
                    prevUser.role !== userData.role ||
                    JSON.stringify(prevUser.siteIds) !== JSON.stringify(userData.siteIds)) {
                  return userData;
                }
                // Data is the same, return previous reference to prevent re-render
                return prevUser;
              });
            })
            .catch((err) => {
              // Only log error if it's not a network error (backend not running)
              const errorMessage = err instanceof Error ? err.message : String(err);
              const isNetworkError = errorMessage.includes("Failed to connect") || errorMessage.includes("Failed to fetch");
              
              if (!isNetworkError) {
                console.error("Failed to refresh user data", err);
              } else {
                // Silently handle network errors - backend might not be running
                // Keep the stored user data if available
                console.debug("[AuthContext] Backend not available, using stored user data");
              }
              
              // If 401, we already cleared tokens and set user to null
              // For other errors, keep the stored user if it exists and role is valid
              if (err.message !== "Unauthorized - session expired" && parsedUser?.role) {
                parsedUser.role = parsedUser.role.toLowerCase();
                // Only update if user actually changed
                setUser((prevUser) => {
                  if (!prevUser || prevUser.id !== parsedUser.id || prevUser.role !== parsedUser.role) {
                    return parsedUser;
                  }
                  return prevUser;
                });
              } else {
                // Clear user if unauthorized or no valid stored user
                setUser(null);
              }
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setIsLoading(false);
      }
    } else {
      // Try to refresh token if we have a refresh token
      if (storedRefreshToken && !storedToken) {
        refreshToken({ refreshToken: storedRefreshToken })
          .then((data) => {
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
          })
          .catch(() => {
            // Refresh failed, clear everything
            localStorage.removeItem("user");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  // Load user from localStorage on mount and refresh from API
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // Listen for storage changes (e.g., from Google OAuth callback)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If accessToken or user changed, reload user data
      if (e.key === "accessToken" || e.key === "user") {
        loadUserFromStorage();
      }
    };

    // Also listen for custom storage events (for same-tab updates)
    const handleCustomStorageEvent = () => {
      loadUserFromStorage();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth:storage-update", handleCustomStorageEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth:storage-update", handleCustomStorageEvent);
    };
  }, [loadUserFromStorage]);

  const handleLogin = useCallback(async (email: string, password: string, twoFactorToken?: string) => {
    const response = await login({ email, password, twoFactorToken });
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    // Ensure role is correctly stored (convert to lowercase if needed)
    const userData = {
      ...response.user,
      role: response.user.role.toLowerCase() as User["role"],
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const handleRegister = useCallback(async (data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    bio?: string;
  }) => {
    const response = await register(data);
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    // Ensure role is correctly stored
    const userData = {
      ...response.user,
      role: response.user.role.toLowerCase() as User["role"],
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);


  // Refresh user function that can be called externally
  const handleRefreshUser = useCallback(async () => {
    await loadUserFromStorage();
  }, [loadUserFromStorage]);

  // Memoize context value to ensure stable reference
  // Only recreate when user, isLoading, or handlers change
  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshUser: handleRefreshUser,
    }),
    [user, isLoading, handleLogin, handleRegister, handleLogout, handleRefreshUser]
  );

  const handleSessionExtended = useCallback(() => {
    setShowSessionToast(false);
  }, []);

  const handleSessionToastDismiss = useCallback(() => {
    // Toast only dismisses on logout, not manually
    // But we can hide it if user extends session
    setShowSessionToast(false);
  }, []);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {showSessionToast && (
        <SessionExtensionToast
          onExtend={handleSessionExtended}
          onDismiss={handleSessionToastDismiss}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { User } from "../api/auth.api";
import { login, register, logout as apiLogout, refreshToken } from "../api/auth.api";
import { isTokenExpired } from "../utils/tokenUtils";

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(async () => {
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
      // Redirect to login page (admin login)
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/admin/login") && !currentPath.startsWith("/admin/register") && !currentPath.startsWith("/admin/forgot-password") && !currentPath.startsWith("/admin/reset-password")) {
        window.location.href = "/admin/login";
      }
    }
  }, []);

  // Check token expiration periodically and handle logout event
  useEffect(() => {
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
          handleLogout();
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
              handleLogout();
            });
        } else {
          // Both tokens expired, logout
          handleLogout();
        }
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 10 seconds (more frequent for better responsiveness)
    const interval = setInterval(checkTokenExpiration, 10000);

    // Listen for logout event from API client
    const handleLogoutEvent = () => {
      handleLogout();
    };
    window.addEventListener("auth:logout", handleLogoutEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [user, handleLogout]);

  // Load user from localStorage on mount and refresh from API
  useEffect(() => {
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
              throw new Error("Failed to fetch user");
            })
            .then((freshUser) => {
              // Update with fresh data from API - ensure role is lowercase
              const role = (freshUser.role || "").toLowerCase() as User["role"];
              const userData = {
                ...freshUser,
                role,
                tenantIds: freshUser.tenants?.map((ut: { tenantId: string }) => ut.tenantId) || [],
              };
              localStorage.setItem("user", JSON.stringify(userData));
              setUser(userData);
            })
            .catch((err) => {
              console.error("Failed to refresh user data", err);
              // Keep the stored user if API call fails, but ensure role is lowercase
              if (parsedUser.role) {
                parsedUser.role = parsedUser.role.toLowerCase();
                setUser(parsedUser);
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

  const handleLogin = async (email: string, password: string, twoFactorToken?: string) => {
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
  };

  const handleRegister = async (data: {
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
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
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


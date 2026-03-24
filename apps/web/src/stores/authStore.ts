// src/stores/authStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User } from "../api/auth.api";
import { login, register, logout as apiLogout, refreshToken } from "../api/auth.api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  showSessionModal: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setShowSessionModal: (show: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
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
  loadUserFromStorage: () => Promise<void>;
  refreshTokenIfNeeded: () => Promise<boolean>;

  // Derived
  isAuthenticated: boolean;
}

/**
 * Type guard to validate user object from API/localStorage
 */
function isValidUser(user: unknown): user is User {
  if (!user || typeof user !== "object") return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    typeof u.role === "string" &&
    u.id.trim().length > 0 &&
    u.email.trim().length > 0
  );
}

/**
 * Helper to extract language code from URL or localStorage
 */
function getLanguageCode(): string {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const pathMatch = currentPath.match(/^\/(hu|en|de)(\/|$)/);
  if (pathMatch && ["hu", "en", "de"].includes(pathMatch[1])) {
    return pathMatch[1];
  }
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && ["hu", "en", "de"].includes(stored)) return stored;
  }
  return "en";
}

/**
 * Helper to redirect after logout
 */
function redirectAfterLogout(isManualLogout: boolean, lang: string): void {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const isInAdminArea = currentPath.includes("/admin") && !currentPath.includes("/admin/login");

  if (isManualLogout) {
    if (isInAdminArea) {
      const logoutLang = localStorage.getItem("logoutRedirectLang") || lang;
      localStorage.removeItem("logoutRedirectLang");
      sessionStorage.setItem("wasManualLogout", "true");

      if (
        currentPath === `/${logoutLang}/admin/login` ||
        currentPath === `/${logoutLang}/admin/login/`
      ) {
        return;
      }
      setTimeout(() => {
        window.location.href = `/${logoutLang}/admin/login`;
      }, 0);
    }
  } else {
    // Automatic logout (session expired)
    if (!isInAdminArea) return;

    if (currentPath.startsWith(`/${lang}/admin/login`)) return;

    sessionStorage.setItem("sessionExpired", "true");
    setTimeout(() => {
      window.location.href = `/${lang}/admin/login`;
    }, 0);
  }
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: true,
        showSessionModal: false,
        error: null,
        isAuthenticated: false,

        setUser: (user) => {
          set(
            { user, isAuthenticated: !!user, error: null },
            false,
            "setUser"
          );
        },

        setIsLoading: (isLoading) => {
          set({ isLoading }, false, "setIsLoading");
        },

        setShowSessionModal: (show) => {
          set({ showSessionModal: show }, false, "setShowSessionModal");
        },

        setError: (error) => {
          set({ error }, false, "setError");
        },

        login: async (email: string, password: string, twoFactorToken?: string) => {
          try {
            set({ isLoading: true, error: null }, false, "login:start");
            const response = await login({ email, password, twoFactorToken });

            if (!isValidUser(response.user)) {
              throw new Error("Invalid user data from API");
            }

            const userData = {
              ...response.user,
              role: response.user.role.toLowerCase() as User["role"],
            };

            // Store tokens
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("accessToken", response.accessToken);
              localStorage.setItem("refreshToken", response.refreshToken);
              localStorage.setItem("user", JSON.stringify(userData));
            }

            set(
              {
                user: userData,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              "login:success"
            );
          } catch (err) {
            const error = err instanceof Error ? err.message : "Login failed";
            set({ error, isLoading: false }, false, "login:error");
            throw err;
          }
        },

        register: async (data) => {
          try {
            set({ isLoading: true, error: null }, false, "register:start");
            const response = await register(data);

            if (!isValidUser(response.user)) {
              throw new Error("Invalid user data from API");
            }

            const userData = {
              ...response.user,
              role: response.user.role.toLowerCase() as User["role"],
            };

            // Store tokens
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("accessToken", response.accessToken);
              localStorage.setItem("refreshToken", response.refreshToken);
              localStorage.setItem("user", JSON.stringify(userData));
            }

            set(
              {
                user: userData,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              "register:success"
            );
          } catch (err) {
            const error = err instanceof Error ? err.message : "Registration failed";
            set({ error, isLoading: false }, false, "register:error");
            throw err;
          }
        },

        logout: async (isManualLogout = false) => {
          try {
            // Try to call API logout, but don't fail if it errors
            try {
              await apiLogout();
            } catch (e) {
              console.error("API logout error", e);
            }

            if (typeof localStorage !== "undefined") {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              localStorage.removeItem("adminSelectedTenantId");
            }

            set(
              {
                user: null,
                isAuthenticated: false,
                showSessionModal: false,
                error: null,
              },
              false,
              "logout"
            );

            const lang = getLanguageCode();
            redirectAfterLogout(isManualLogout, lang);
          } catch (err) {
            console.error("Logout error", err);
          }
        },

        loadUserFromStorage: async () => {
          try {
            set({ isLoading: true }, false, "loadUserFromStorage:start");

            if (typeof localStorage === "undefined") {
              set({ isLoading: false }, false, "loadUserFromStorage:noStorage");
              return;
            }

            const storedUser = localStorage.getItem("user");
            const storedToken = localStorage.getItem("accessToken");

            if (!storedUser || !storedToken) {
              set({ user: null, isAuthenticated: false, isLoading: false }, false, "loadUserFromStorage:noData");
              return;
            }

            let parsedUser: User;
            try {
              parsedUser = JSON.parse(storedUser);
            } catch (parseErr) {
              console.error("[AuthStore] Invalid user JSON in localStorage", parseErr);
              localStorage.removeItem("user");
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              set({ user: null, isAuthenticated: false, isLoading: false }, false, "loadUserFromStorage:parseError");
              return;
            }

            if (!isValidUser(parsedUser)) {
              console.error("[AuthStore] Invalid user object from localStorage");
              localStorage.removeItem("user");
              set({ user: null, isAuthenticated: false, isLoading: false }, false, "loadUserFromStorage:invalidUser");
              return;
            }

            // Ensure role is lowercase
            if (parsedUser.role && typeof parsedUser.role === "string") {
              parsedUser.role = parsedUser.role.toLowerCase() as User["role"];
            }

            // Set user immediately
            set({ user: parsedUser, isAuthenticated: true }, false, "loadUserFromStorage:fromStorage");

            // Refresh from API if token exists
            if (storedToken) {
              try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const apiBaseUrl = apiUrl ? apiUrl.replace(/\/$/, "") : "";
                const response = await fetch(`${apiBaseUrl}/api/admin/users/me`, {
                  headers: {
                    Authorization: `Bearer ${storedToken}`,
                    Accept: "application/json",
                  },
                });

                if (!response.ok) {
                  if (response.status === 401) {
                    // Token expired
                    localStorage.removeItem("user");
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    set({ user: null, isAuthenticated: false }, false, "loadUserFromStorage:tokenExpired");
                  }
                  return;
                }

                const freshUser = await response.json();
                if (!isValidUser(freshUser)) {
                  console.error("[AuthStore] Invalid user from API");
                  return;
                }

                const role = (freshUser.role || "").toLowerCase() as User["role"];
                const siteIds = Array.isArray(freshUser.siteIds)
                  ? freshUser.siteIds.filter((id): id is string => typeof id === "string")
                  : Array.isArray((freshUser as unknown as { sites?: Array<{ siteId: string }> }).sites)
                  ? ((freshUser as unknown as { sites: Array<{ siteId: string }> }).sites
                      .map((s) => s?.siteId)
                      .filter((id): id is string => typeof id === "string"))
                  : [];

                const updatedUser = {
                  ...freshUser,
                  role,
                  siteIds,
                } as User;

                localStorage.setItem("user", JSON.stringify(updatedUser));
                set({ user: updatedUser }, false, "loadUserFromStorage:fromAPI");
              } catch (error) {
                console.error("[AuthStore] Error refreshing user from API", error);
                // Keep the stored user even if API call fails
              } finally {
                set({ isLoading: false }, false, "loadUserFromStorage:done");
              }
            } else {
              set({ isLoading: false }, false, "loadUserFromStorage:noToken");
            }
          } catch (err) {
            console.error("[AuthStore] Unexpected error in loadUserFromStorage", err);
            set({ isLoading: false, error: "Failed to load user" }, false, "loadUserFromStorage:error");
          }
        },

        refreshTokenIfNeeded: async () => {
          try {
            if (typeof localStorage === "undefined") return false;

            const accessToken = localStorage.getItem("accessToken");
            const refreshTokenValue = localStorage.getItem("refreshToken");

            if (!accessToken || !refreshTokenValue) return false;

            try {
              const payload = JSON.parse(atob(accessToken.split(".")[1]));
              const expiresAt = payload.exp * 1000;
              const now = Date.now();
              const timeUntilExpiry = expiresAt - now;

              // If token expires in less than 5 minutes, refresh it
              if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
                const data = await refreshToken({ refreshToken: refreshTokenValue });
                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                get().setShowSessionModal(false);
                return true;
              }
            } catch (error) {
              console.error("[AuthStore] Invalid token format", error);
            }
          } catch (error) {
            console.error("[AuthStore] Error refreshing token", error);
          }
          return false;
        },

        refreshUser: async () => {
          await get().loadUserFromStorage();
        },
      }),
      {
        name: "auth-store",
        partialize: (state) => ({
          // Only persist user and isAuthenticated
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);

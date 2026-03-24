// src/stores/adminSiteStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { getSites, getSite, type Site } from "../api/admin.api";
import { ROLE_SUPERADMIN, ROLE_ADMIN } from "../types/enums";

// Input validation helpers
const isValidSiteId = (id: unknown): id is string => {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 255;
};

const isValidSiteIdArray = (arr: unknown): arr is string[] => {
  return Array.isArray(arr) && arr.every(isValidSiteId);
};

export interface AdminSiteState {
  selectedSiteId: string | null;
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  isSitesLoaded: boolean;

  // Actions
  setSelectedSiteId: (siteId: string | null) => void;
  loadSites: (user: { role: string; siteIds?: string[]; tenantIds?: string[] } | null) => Promise<void>;
  reloadSites: (user: { role: string; siteIds?: string[]; tenantIds?: string[] } | null) => Promise<void>;
  setSites: (sites: Site[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAdminSiteStore = create<AdminSiteState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedSiteId: null,
        sites: [],
        isLoading: false,
        error: null,
        isSitesLoaded: false,

        setSelectedSiteId: (siteId: string | null) => {
          // Only store if siteId is valid or null
          if (siteId === null || isValidSiteId(siteId)) {
            set({ selectedSiteId: siteId });
            if (siteId) {
              localStorage.setItem("adminSelectedSiteId", siteId);
            } else {
              localStorage.removeItem("adminSelectedSiteId");
            }
          } else {
            console.warn("[AdminSiteStore] Invalid siteId provided", siteId);
            set({ selectedSiteId: null });
            localStorage.removeItem("adminSelectedSiteId");
          }
        },

        loadSites: async (user) => {
          // Skip if already loaded
          if (get().isSitesLoaded) {
            return;
          }

          // Don't load if user is not logged in
          if (!user) {
            set({ isLoading: false, sites: [], selectedSiteId: null, error: null });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            let loadedSites: Site[] = [];

            // Only superadmin and admin can call getSites to see all sites
            if (user.role === ROLE_SUPERADMIN || user.role === ROLE_ADMIN) {
              loadedSites = await getSites();
            } else if (isValidSiteIdArray(user.siteIds)) {
              // Regular users see only their assigned sites (validate siteIds)
              const sitePromises = user.siteIds.map((siteId: string) =>
                getSite(siteId).catch((err: unknown) => {
                  console.error(`Failed to load site ${siteId}`, err);
                  return null;
                })
              );
              const siteResults = await Promise.all(sitePromises);
              loadedSites = siteResults.filter((s: Site | null): s is Site => s !== null);
            } else if (isValidSiteIdArray(user.tenantIds)) {
              // Fallback to tenantIds for backward compatibility (validate tenantIds)
              const sitePromises = user.tenantIds.map((siteId: string) =>
                getSite(siteId).catch((err: unknown) => {
                  console.error(`Failed to load site ${siteId}`, err);
                  return null;
                })
              );
              const siteResults = await Promise.all(sitePromises);
              loadedSites = siteResults.filter((s: Site | null): s is Site => s !== null);
            }

            // Compute auto-selected site
            const stored = localStorage.getItem("adminSelectedSiteId");
            let computedSelectedSiteId: string | null = null;

            if (loadedSites.length > 0) {
              if (isValidSiteId(stored) && loadedSites.some((s) => s.id === stored)) {
                computedSelectedSiteId = stored;
              } else {
                const firstSiteId = loadedSites[0]?.id;
                computedSelectedSiteId = isValidSiteId(firstSiteId) ? firstSiteId : null;
              }
            }

            set({
              sites: loadedSites,
              selectedSiteId: computedSelectedSiteId,
              error: null,
              isSitesLoaded: true,
            });

            if (computedSelectedSiteId) {
              localStorage.setItem("adminSelectedSiteId", computedSelectedSiteId);
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            const isNetworkError =
              errorMessage.includes("Failed to connect") || errorMessage.includes("Failed to fetch");
            const isSchemaError =
              errorMessage.includes("Database schema is out of sync") ||
              errorMessage.includes("migrations");

            if (!isNetworkError) {
              console.error("[AdminSiteStore] Failed to load sites", err);

              if (isSchemaError) {
                console.warn(
                  "[AdminSiteStore] Database schema is out of sync. Please run migrations on the server."
                );
                set({
                  error: "Database schema is out of sync. Please contact the administrator to run migrations.",
                });
              } else {
                set({ error: "Failed to load sites. Please try again later." });
              }
            } else {
              console.debug("[AdminSiteStore] Backend not available, skipping site load");
              set({ error: null });
            }
            set({ sites: [], isSitesLoaded: true });
          } finally {
            set({ isLoading: false });
          }
        },

        reloadSites: async (user) => {
          set({ isSitesLoaded: false });
          await get().loadSites(user);
        },

        setSites: (sites) => {
          set({ sites });
        },

        setError: (error) => {
          set({ error });
        },

        reset: () => {
          set({
            selectedSiteId: null,
            sites: [],
            isLoading: false,
            error: null,
            isSitesLoaded: false,
          });
          localStorage.removeItem("adminSelectedSiteId");
        },
      }),
      {
        name: "admin-site-store",
        partialize: (state) => ({
          selectedSiteId: state.selectedSiteId,
        }),
      }
    )
  )
);

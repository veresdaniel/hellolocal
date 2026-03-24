// src/contexts/AdminSiteContext.tsx
import { useContext, useEffect, useMemo, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { useAdminSiteStore } from "../stores/adminSiteStore";
import { AdminSiteContext as AdminSiteContextDef, type AdminSiteContextType } from "./AdminSiteContext.shared";

export function AdminSiteProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const authIsLoading = authContext?.isLoading ?? false;

  // Get store state and actions
  const selectedSiteId = useAdminSiteStore((state) => state.selectedSiteId);
  const sites = useAdminSiteStore((state) => state.sites);
  const isLoading = useAdminSiteStore((state) => state.isLoading);
  const error = useAdminSiteStore((state) => state.error);
  const loadSites = useAdminSiteStore((state) => state.loadSites);
  const reloadSites = useAdminSiteStore((state) => state.reloadSites);
  const setSelectedSiteId = useAdminSiteStore((state) => state.setSelectedSiteId);
  const reset = useAdminSiteStore((state) => state.reset);

  // Load sites when auth state changes (only one effect now)
  useEffect(() => {
    if (authIsLoading) {
      return;
    }

    if (user) {
      loadSites(user);
    } else {
      reset();
    }
  }, [user, authIsLoading, loadSites, reset]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue: AdminSiteContextType = useMemo(
    () => ({
      selectedSiteId,
      sites,
      isLoading: authIsLoading ? true : isLoading,
      error,
      setSelectedSiteId,
      reloadSites: () => reloadSites(user),
    }),
    [selectedSiteId, sites, authIsLoading, isLoading, error, setSelectedSiteId, reloadSites, user]
  );

  return (
    <AdminSiteContextDef.Provider value={contextValue}>{children}</AdminSiteContextDef.Provider>
  );
}

export { AdminSiteContext, type AdminSiteContextType } from "./AdminSiteContext.shared";
export { useAdminSite } from "./useAdminSite";

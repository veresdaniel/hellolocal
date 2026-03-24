// src/contexts/useAdminSite.ts
import { useContext } from "react";
import { AdminSiteContext, type AdminSiteContextType } from "./AdminSiteContext.shared";

export function useAdminSite(): AdminSiteContextType {
  const context = useContext(AdminSiteContext);
  if (context === undefined) {
    // During lazy loading, the context might be undefined temporarily
    // This should not happen if the Provider is properly set up in main.tsx
    // But we handle it gracefully to prevent crashes during lazy loading
    console.warn(
      "useAdminSite called outside AdminSiteProvider - this should not happen if Provider is set up correctly"
    );
    // Return a default value that matches the expected interface
    // Components will re-render once the Provider initializes
    return {
      selectedSiteId: null,
      sites: [],
      isLoading: true,
      error: null,
      setSelectedSiteId: () => {
        console.warn("setSelectedSiteId called outside AdminSiteProvider");
      },
      reloadSites: () => {
        console.warn("reloadSites called outside AdminSiteProvider");
      },
    };
  }
  return context;
}

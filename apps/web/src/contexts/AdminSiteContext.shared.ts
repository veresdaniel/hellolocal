// src/contexts/AdminSiteContext.shared.ts
import { createContext } from "react";
import type { Site } from "../api/admin.api";

export interface AdminSiteContextType {
  selectedSiteId: string | null;
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  reloadSites: () => void;
}

export const AdminSiteContext = createContext<AdminSiteContextType | undefined>(undefined);

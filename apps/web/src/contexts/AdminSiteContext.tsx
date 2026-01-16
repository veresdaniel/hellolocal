// src/contexts/AdminSiteContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { ROLE_SUPERADMIN, ROLE_ADMIN } from "../types/enums";
import { getSites, getSite, type Site } from "../api/admin.api";

interface AdminSiteContextType {
  selectedSiteId: string | null;
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  reloadSites: () => void;
}

export const AdminSiteContext = createContext<AdminSiteContextType | undefined>(undefined);

export function AdminSiteProvider({ children }: { children: ReactNode }) {
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const authIsLoading = authContext?.isLoading ?? false;
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // If AuthContext is still loading, wait for it
  // This prevents showing "please select site" while auth is initializing
  // But once auth is done, we should proceed even if site loading is in progress
  // IMPORTANT: Public pages don't use this context, so isLoading shouldn't block them
  // Only admin pages check isSiteLoading, so this is fine
  const isLoadingSites = authIsLoading ? true : isLoading;
  
  const loadSites = async () => {
    // Don't load if user is not logged in
    if (!user) {
      setIsLoading(false);
      setSites([]);
      setSelectedSiteIdState(null);
      setError(null);
      return;
    }
    
    // Ensure isLoading is true when starting to load
    setIsLoading(true);
    setError(null);
    
    try {
      // Only superadmin and admin can call getSites to see all sites
      if (user.role === ROLE_SUPERADMIN || user.role === ROLE_ADMIN) {
        const data = await getSites();
        setSites(data);
        setError(null); // Clear error on successful load
        // Auto-select first site if none selected
        if (data.length > 0) {
          const stored = localStorage.getItem("adminSelectedSiteId");
          if (stored && data.some((s) => s.id === stored)) {
            setSelectedSiteIdState(stored);
          } else {
            // Always select first site if none selected
            setSelectedSiteIdState(data[0].id);
            localStorage.setItem("adminSelectedSiteId", data[0].id);
          }
        } else {
          setSites([]);
        }
      } else if ((user.siteIds && user.siteIds.length > 0) || (user.tenantIds && user.tenantIds.length > 0)) {
        const siteIds = user.siteIds || user.tenantIds || [];
        // Regular users see only their assigned sites
        // Load each site individually using getSite
        const sitePromises = siteIds.map((siteId: string) => 
          getSite(siteId).catch((err: unknown) => {
            console.error(`Failed to load site ${siteId}`, err);
            return null;
          })
        );
        const siteResults = await Promise.all(sitePromises);
        const userSites = siteResults.filter((s: Site | null): s is Site => s !== null);
        setSites(userSites);
        setError(null); // Clear error on successful load
        if (userSites.length > 0) {
          const stored = localStorage.getItem("adminSelectedSiteId");
          if (stored && userSites.some((s) => s.id === stored)) {
            setSelectedSiteIdState(stored);
          } else {
            setSelectedSiteIdState(userSites[0].id);
            localStorage.setItem("adminSelectedSiteId", userSites[0].id);
          }
        } else {
          setSites([]);
        }
      } else {
        // No site IDs assigned
        setSites([]);
        setError(null); // Clear error when no sites assigned (not an error state)
      }
    } catch (err) {
      // Only log error if it's not a network error (backend not running)
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isNetworkError = errorMessage.includes("Failed to connect") || errorMessage.includes("Failed to fetch");
      const isSchemaError = errorMessage.includes("Database schema is out of sync") || errorMessage.includes("migrations");
      
      if (!isNetworkError) {
        console.error("[AdminSiteContext] Failed to load sites", err);
        
        // For schema errors, set error state but don't crash
        if (isSchemaError) {
          console.warn("[AdminSiteContext] Database schema is out of sync. Please run migrations on the server.");
          setError("Database schema is out of sync. Please contact the administrator to run migrations.");
        } else {
          // For other errors, set a generic error message
          setError("Failed to load sites. Please try again later.");
        }
      } else {
        // Silently handle network errors - backend might not be running
        console.debug("[AdminSiteContext] Backend not available, skipping site load");
        setError(null); // Clear error for network issues
      }
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for AuthContext to finish loading before trying to load sites
    if (authIsLoading) {
      // Still loading auth, keep site loading state but don't try to load sites yet
      // Don't set isLoading here - it's already true from initial state
      return;
    }
    
    // Only load sites if user is logged in
    if (user) {
      loadSites().catch((err) => {
        // Only log error if it's not a network error (backend not running)
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isNetworkError = errorMessage.includes("Failed to connect") || errorMessage.includes("Failed to fetch");
        
        if (!isNetworkError) {
          console.error("[AdminSiteContext] loadSites failed:", err);
        }
        // Ensure isLoading is set to false even if loadSites fails
        setIsLoading(false);
      });
    } else {
      // If no user after auth is done, set loading to false immediately
      // This prevents infinite loading state
      setIsLoading(false);
      setSites([]);
      setSelectedSiteIdState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authIsLoading]);

  useEffect(() => {
    // Auto-select first site if available and none selected
    if (sites.length > 0 && !selectedSiteId) {
      const stored = localStorage.getItem("adminSelectedSiteId");
      if (stored && sites.some((s) => s.id === stored)) {
        setSelectedSiteIdState(stored);
      } else {
        setSelectedSiteIdState(sites[0].id);
        localStorage.setItem("adminSelectedSiteId", sites[0].id);
      }
    }
  }, [sites, selectedSiteId, user]);

  const setSelectedSiteId = (siteId: string | null) => {
    setSelectedSiteIdState(siteId);
    // Store in localStorage for persistence
    if (siteId) {
      localStorage.setItem("adminSelectedSiteId", siteId);
    } else {
      localStorage.removeItem("adminSelectedSiteId");
    }
  };

  // Expose reload function for external use
  const reloadSites = () => {
    loadSites();
  };

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("adminSelectedSiteId");
    if (stored && sites.some((s) => s.id === stored)) {
      setSelectedSiteIdState(stored);
    }
  }, [sites]);

  // Always provide a value, even if not fully initialized
  // This prevents "must be used within a Provider" errors during lazy loading
  const contextValue: AdminSiteContextType = {
    selectedSiteId,
    sites,
    isLoading: isLoadingSites, // Use combined loading state
    error,
    setSelectedSiteId,
    reloadSites,
  };

  return (
    <AdminSiteContext.Provider value={contextValue}>
      {children}
    </AdminSiteContext.Provider>
  );
}

export function useAdminSite() {
  const context = useContext(AdminSiteContext);
  if (context === undefined) {
    // During lazy loading, the context might be undefined temporarily
    // This should not happen if the Provider is properly set up in main.tsx
    // But we handle it gracefully to prevent crashes during lazy loading
    console.warn("useAdminSite called outside AdminSiteProvider - this should not happen if Provider is set up correctly");
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


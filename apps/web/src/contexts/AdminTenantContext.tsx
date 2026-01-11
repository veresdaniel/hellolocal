// src/contexts/AdminTenantContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { getTenants, getTenant, type Tenant } from "../api/admin.api";

interface AdminTenantContextType {
  selectedTenantId: string | null;
  tenants: Tenant[];
  isLoading: boolean;
  setSelectedTenantId: (tenantId: string | null) => void;
  reloadTenants: () => void;
}

export const AdminTenantContext = createContext<AdminTenantContextType | undefined>(undefined);

export function AdminTenantProvider({ children }: { children: ReactNode }) {
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const authIsLoading = authContext?.isLoading ?? false;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // If AuthContext is still loading, wait for it
  // This prevents showing "please select tenant" while auth is initializing
  // But once auth is done, we should proceed even if tenant loading is in progress
  // IMPORTANT: Public pages don't use this context, so isLoading shouldn't block them
  // Only admin pages check isTenantLoading, so this is fine
  const isLoadingTenants = authIsLoading ? true : isLoading;
  
  const loadTenants = async () => {
    // Don't load if user is not logged in
    if (!user) {
      setIsLoading(false);
      setTenants([]);
      setSelectedTenantIdState(null);
      return;
    }
    
    // Ensure isLoading is true when starting to load
    setIsLoading(true);
    
    try {
      // Only superadmin and admin can call getTenants to see all tenants
      if (user.role === "superadmin" || user.role === "admin") {
        const data = await getTenants();
        setTenants(data);
        // Auto-select first tenant if none selected
        if (data.length > 0) {
          const stored = localStorage.getItem("adminSelectedTenantId");
          if (stored && data.some((t) => t.id === stored)) {
            setSelectedTenantIdState(stored);
          } else {
            // Always select first tenant if none selected
            setSelectedTenantIdState(data[0].id);
            localStorage.setItem("adminSelectedTenantId", data[0].id);
          }
        } else {
          setTenants([]);
        }
      } else if (user.tenantIds && user.tenantIds.length > 0) {
        // Regular users see only their assigned tenants
        // Load each tenant individually using getTenant
        const tenantPromises = user.tenantIds.map((tenantId: string) => 
          getTenant(tenantId).catch((err: unknown) => {
            console.error(`Failed to load tenant ${tenantId}`, err);
            return null;
          })
        );
        const tenantResults = await Promise.all(tenantPromises);
        const userTenants = tenantResults.filter((t: Tenant | null): t is Tenant => t !== null);
        setTenants(userTenants);
        if (userTenants.length > 0) {
          const stored = localStorage.getItem("adminSelectedTenantId");
          if (stored && userTenants.some((t) => t.id === stored)) {
            setSelectedTenantIdState(stored);
          } else {
            setSelectedTenantIdState(userTenants[0].id);
            localStorage.setItem("adminSelectedTenantId", userTenants[0].id);
          }
        } else {
          setTenants([]);
        }
      } else {
        // No tenant IDs assigned
        setTenants([]);
      }
    } catch (err) {
      console.error("[AdminTenantContext] Failed to load tenants", err);
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for AuthContext to finish loading before trying to load tenants
    if (authIsLoading) {
      // Still loading auth, keep tenant loading state but don't try to load tenants yet
      // Don't set isLoading here - it's already true from initial state
      return;
    }
    
    // Only load tenants if user is logged in
    if (user) {
      loadTenants().catch((err) => {
        console.error("[AdminTenantContext] loadTenants failed:", err);
        // Ensure isLoading is set to false even if loadTenants fails
        setIsLoading(false);
      });
    } else {
      // If no user after auth is done, set loading to false immediately
      // This prevents infinite loading state
      setIsLoading(false);
      setTenants([]);
      setSelectedTenantIdState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authIsLoading]);

  useEffect(() => {
    // Auto-select first tenant if available and none selected
    if (tenants.length > 0 && !selectedTenantId) {
      const stored = localStorage.getItem("adminSelectedTenantId");
      if (stored && tenants.some((t) => t.id === stored)) {
        setSelectedTenantIdState(stored);
      } else {
        setSelectedTenantIdState(tenants[0].id);
        localStorage.setItem("adminSelectedTenantId", tenants[0].id);
      }
    }
  }, [tenants, selectedTenantId, user]);


  const setSelectedTenantId = (tenantId: string | null) => {
    setSelectedTenantIdState(tenantId);
    // Store in localStorage for persistence
    if (tenantId) {
      localStorage.setItem("adminSelectedTenantId", tenantId);
    } else {
      localStorage.removeItem("adminSelectedTenantId");
    }
  };

  // Expose reload function for external use
  const reloadTenants = () => {
    loadTenants();
  };

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("adminSelectedTenantId");
    if (stored && tenants.some((t) => t.id === stored)) {
      setSelectedTenantIdState(stored);
    }
  }, [tenants]);

  // Always provide a value, even if not fully initialized
  // This prevents "must be used within a Provider" errors during lazy loading
  const contextValue: AdminTenantContextType = {
    selectedTenantId,
    tenants,
    isLoading: isLoadingTenants, // Use combined loading state
    setSelectedTenantId,
    reloadTenants,
  };

  return (
    <AdminTenantContext.Provider value={contextValue}>
      {children}
    </AdminTenantContext.Provider>
  );
}

export function useAdminTenant() {
  const context = useContext(AdminTenantContext);
  if (context === undefined) {
    // During lazy loading, the context might be undefined temporarily
    // This should not happen if the Provider is properly set up in main.tsx
    // But we handle it gracefully to prevent crashes during lazy loading
    console.warn("useAdminTenant called outside AdminTenantProvider - this should not happen if Provider is set up correctly");
    // Return a default value that matches the expected interface
    // Components will re-render once the Provider initializes
    return {
      selectedTenantId: null,
      tenants: [],
      isLoading: true,
      setSelectedTenantId: () => {
        console.warn("setSelectedTenantId called outside AdminTenantProvider");
      },
      reloadTenants: () => {
        console.warn("reloadTenants called outside AdminTenantProvider");
      },
    };
  }
  return context;
}


// src/contexts/AdminTenantContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getTenants, getTenant, type Tenant } from "../api/admin.api";

interface AdminTenantContextType {
  selectedTenantId: string | null;
  tenants: Tenant[];
  isLoading: boolean;
  setSelectedTenantId: (tenantId: string | null) => void;
  reloadTenants: () => void;
}

const AdminTenantContext = createContext<AdminTenantContextType | undefined>(undefined);

export function AdminTenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTenants = async () => {
    // Don't load if user is not logged in
    if (!user) {
      setIsLoading(false);
      return;
    }
    
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
      console.error("Failed to load tenants", err);
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only load tenants if user is logged in
    if (user) {
      loadTenants();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  return (
    <AdminTenantContext.Provider
      value={{
        selectedTenantId,
        tenants,
        isLoading,
        setSelectedTenantId,
        reloadTenants,
      }}
    >
      {children}
    </AdminTenantContext.Provider>
  );
}

export function useAdminTenant() {
  const context = useContext(AdminTenantContext);
  if (context === undefined) {
    throw new Error("useAdminTenant must be used within an AdminTenantProvider");
  }
  return context;
}


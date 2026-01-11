// src/pages/admin/AdminDashboardWrapper.tsx
// Wrapper component to force re-render when user changes
import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { AdminDashboard } from "./AdminDashboard";

export function AdminDashboardWrapper() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [renderKey, setRenderKey] = useState(0);
  const prevUserIdRef = useRef<string | null>(null);
  const prevUserRoleRef = useRef<string | null>(null);

  // Force re-render when user ID or role changes (not the entire user object)
  // This prevents infinite loops if the user object reference changes but content is the same
  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentUserRole = user?.role || null;
    
    // Only update if user ID or role actually changed
    if (prevUserIdRef.current !== currentUserId || prevUserRoleRef.current !== currentUserRole) {
      prevUserIdRef.current = currentUserId;
      prevUserRoleRef.current = currentUserRole;
      
      if (user) {
        setRenderKey((prev) => prev + 1);
      }
    }
  }, [user?.id, user?.role]); // Only depend on user ID and role, not the entire object

  return <AdminDashboard key={renderKey} />;
}

// src/pages/admin/AdminDashboardWrapper.tsx
// Wrapper component to force re-render when user changes
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { AdminDashboard } from "./AdminDashboard";

export function AdminDashboardWrapper() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [renderKey, setRenderKey] = useState(0);

  // Debug: Log user changes
  useEffect(() => {
    console.log("[AdminDashboardWrapper] User changed:", user);
    console.log("[AdminDashboardWrapper] User role:", user?.role);
    console.log("[AdminDashboardWrapper] Current renderKey:", renderKey);
  }, [user, renderKey]);

  // Force re-render when user changes (especially after login)
  // Use the entire user object as dependency to catch any changes
  useEffect(() => {
    console.log("[AdminDashboardWrapper] useEffect triggered, user:", user);
    if (user) {
      console.log("[AdminDashboardWrapper] Setting new renderKey due to user change");
      setRenderKey((prev) => {
        const newKey = prev + 1;
        console.log("[AdminDashboardWrapper] New renderKey:", newKey);
        return newKey;
      });
    }
  }, [user]); // Use entire user object as dependency

  return <AdminDashboard key={renderKey} />;
}

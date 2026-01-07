// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminTenantProvider } from "./contexts/AdminTenantContext";
import { router } from "./app/routes";
import "./i18n/config";
import { useDefaultLanguage } from "./hooks/useDefaultLanguage";

// Component to initialize default language
function AppInitializer({ children }: { children: React.ReactNode }) {
  useDefaultLanguage();
  return <>{children}</>;
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminTenantProvider>
          <AppInitializer>
            <RouterProvider router={router} />
          </AppInitializer>
        </AdminTenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

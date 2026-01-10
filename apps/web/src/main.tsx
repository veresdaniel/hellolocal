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
import { NotificationService } from "./services/notification.service";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Component to initialize default language and service worker
function AppInitializer({ children }: { children: React.ReactNode }) {
  useDefaultLanguage();

  // Register service worker on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      NotificationService.register().then((registered) => {
        if (registered) {
          console.log("Service Worker and notifications registered");
        }
      });
    }
  }, []);

  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Default: consider data stale after 30 seconds
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true, // Refetch when component mounts
      retry: 1, // Retry failed requests once
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminTenantProvider>
            <AppInitializer>
              <RouterProvider router={router} />
            </AppInitializer>
          </AdminTenantProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

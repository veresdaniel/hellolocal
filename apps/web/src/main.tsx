// src/main.tsx
import { StrictMode, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminSiteProvider } from "./contexts/AdminSiteContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { router } from "./app/routes";
import "./i18n/config";
import { useDefaultLanguage } from "./hooks/useDefaultLanguage";
import { NotificationService } from "./services/notification.service";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { ReactNode } from "react";

// Component to initialize default language and service worker
function AppInitializer({ children }: { children: ReactNode }) {
  useDefaultLanguage();

  // Register service worker on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      NotificationService.register().then((registered) => {
        if (registered) {
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
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInitializer>
          <ToastProvider>
            <AuthProvider>
              <AdminSiteProvider>
                <RouterProvider router={router} />
              </AdminSiteProvider>
            </AuthProvider>
            <ToastContainer />
          </ToastProvider>
        </AppInitializer>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

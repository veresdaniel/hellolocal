// src/app/routes.tsx
import { createBrowserRouter } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "./config";
import { TenantLayout } from "./tenant/TenantLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RootRedirect } from "../components/RootRedirect";

import { HomePage } from "../pages/HomePage";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LegalPage } from "../pages/LegalPage";
import { StaticPagesListPage } from "../pages/StaticPagesListPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { UserProfilePage } from "../pages/admin/UserProfilePage";
import { UsersPage } from "../pages/admin/UsersPage";
import { CategoriesPage } from "../pages/admin/CategoriesPage";
import { TagsPage } from "../pages/admin/TagsPage";
import { PriceBandsPage } from "../pages/admin/PriceBandsPage";
import { TownsPage } from "../pages/admin/TownsPage";
import { LegalPagesPage } from "../pages/admin/LegalPagesPage";
import { StaticPagesPage } from "../pages/admin/StaticPagesPage";
import { TenantsPage } from "../pages/admin/TenantsPage";
import { PlacesPage } from "../pages/admin/PlacesPage";
import { EventsPage } from "../pages/admin/EventsPage";
import { AppSettingsPage } from "../pages/admin/AppSettingsPage";
import { AdminLayout } from "../components/AdminLayout";

const tenantSuffix = HAS_MULTIPLE_TENANTS ? "/:tenantSlug" : "";

export const router = createBrowserRouter([
  // root -> default nyelv (dynamically loaded from app settings)
  { path: "/", element: <RootRedirect /> },

  {
    path: `/:lang${tenantSuffix}`,
    element: <TenantLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "place/:slug", element: <PlaceDetailPage /> },
      { path: "event/:slug", element: <EventDetailPage /> },
      { path: "static-pages", element: <StaticPagesListPage /> },

      { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
      { path: "aszf", element: <LegalPage pageKey="terms" /> },
      { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
    ],
  },

  // Admin routes (no language prefix)
  {
    path: "/admin",
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "",
        element: (
          <ProtectedRoute requiredRole="viewer">
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute requiredRole="viewer">
            <AdminLayout>
              <UserProfilePage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <AdminLayout>
              <UsersPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "categories",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <CategoriesPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "tags",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <TagsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "price-bands",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <PriceBandsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "places",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <PlacesPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "towns",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <TownsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "legal",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <LegalPagesPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "static-pages",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <StaticPagesPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "tenants",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <AdminLayout>
              <TenantsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "app-settings",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <AdminLayout>
              <AppSettingsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: "events",
        element: (
          <ProtectedRoute requiredRole="editor">
            <AdminLayout>
              <EventsPage />
            </AdminLayout>
          </ProtectedRoute>
        ),
      },
    ],
  },

  { path: "*", element: <div style={{ padding: 24 }}>404</div> },
]);

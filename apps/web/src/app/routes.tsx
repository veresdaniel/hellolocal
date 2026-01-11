// src/app/routes.tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "./config";
import { TenantLayout } from "./tenant/TenantLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RootRedirect } from "../components/RootRedirect";
import { LoadingSpinner } from "../components/LoadingSpinner";

// Public pages - loaded eagerly (main entry point)
import { HomePage } from "../pages/HomePage";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LegalPage } from "../pages/LegalPage";
import { StaticPagesRouteGuard } from "../components/StaticPagesRouteGuard";
import { TenantsListPage } from "../pages/TenantsListPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorPage } from "../pages/ErrorPage";

// Auth pages - loaded eagerly (small, needed for login)
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";

// Admin pages - lazy loaded (only needed when user is logged in)
const AdminDashboardWrapper = lazy(() => import("../pages/admin/AdminDashboardWrapper").then(m => ({ default: m.AdminDashboardWrapper })));
const UserProfilePage = lazy(() => import("../pages/admin/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const UsersPage = lazy(() => import("../pages/admin/UsersPage").then(m => ({ default: m.UsersPage })));
const CategoriesPage = lazy(() => import("../pages/admin/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const TagsPage = lazy(() => import("../pages/admin/TagsPage").then(m => ({ default: m.TagsPage })));
const PriceBandsPage = lazy(() => import("../pages/admin/PriceBandsPage").then(m => ({ default: m.PriceBandsPage })));
const TownsPage = lazy(() => import("../pages/admin/TownsPage").then(m => ({ default: m.TownsPage })));
const LegalPagesPage = lazy(() => import("../pages/admin/LegalPagesPage").then(m => ({ default: m.LegalPagesPage })));
const StaticPagesPage = lazy(() => import("../pages/admin/StaticPagesPage").then(m => ({ default: m.StaticPagesPage })));
const TenantsPage = lazy(() => import("../pages/admin/TenantsPage").then(m => ({ default: m.TenantsPage })));
const PlacesPage = lazy(() => import("../pages/admin/PlacesPage").then(m => ({ default: m.PlacesPage })));
const EventsPage = lazy(() => import("../pages/admin/EventsPage").then(m => ({ default: m.EventsPage })));
const AppSettingsPage = lazy(() => import("../pages/admin/AppSettingsPage").then(m => ({ default: m.AppSettingsPage })));
const EventLogPage = lazy(() => import("../pages/admin/EventLogPage").then(m => ({ default: m.EventLogPage })));
const AdminLayout = lazy(() => import("../components/AdminLayout").then(m => ({ default: m.AdminLayout })));

// If multi-tenant is enabled, we need two separate routes
// One with tenant slug and one without
// IMPORTANT: These routes should NOT match /admin paths
const createPublicRoutes = () => {
  const baseChildren = [
    { index: true, element: <HomePage /> },
    { path: "place/:slug", element: <PlaceDetailPage /> },
    { path: "event/:slug", element: <EventDetailPage /> },
    { path: "static-pages", element: <StaticPagesRouteGuard /> },
    // Tenants page - use language from URL, not from path
    { path: "teruletek", element: <TenantsListPage /> },
    { path: "regions", element: <TenantsListPage /> },
    { path: "regionen", element: <TenantsListPage /> },
    { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
    { path: "aszf", element: <LegalPage pageKey="terms" /> },
    { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
  ];

  if (HAS_MULTIPLE_TENANTS) {
    // Return two routes: one with tenant slug, one without
    // The tenant slug route should NOT match "admin"
    return [
      {
        path: `/:lang`,
        element: <TenantLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
      {
        // This route should only match tenant slugs, not "admin"
        // We can't exclude "admin" directly, but the admin routes should be matched first
        path: `/:lang/:tenantSlug`,
        element: <TenantLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
    ];
  } else {
    // Single tenant mode - just one route without tenant slug
    return [
      {
        path: `/:lang`,
        element: <TenantLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
    ];
  }
};

export const router = createBrowserRouter([
  // root -> default nyelv (dynamically loaded from app settings)
  { path: "/", element: <RootRedirect /> },
  
  // Legacy admin routes redirect to language-specific routes
  // IMPORTANT: These MUST be defined BEFORE any other routes that could match /admin/*
  { path: "/admin", element: <RootRedirect /> },
  { path: "/admin/login", element: <RootRedirect /> },
  { path: "/admin/register", element: <RootRedirect /> },
  { path: "/admin/forgot-password", element: <RootRedirect /> },
  { path: "/admin/reset-password", element: <RootRedirect /> },
  { path: "/admin/*", element: <RootRedirect /> },

  // Admin routes (with language prefix) - MUST come before /:lang route to avoid conflicts
  {
    path: `/:lang/admin`,
    element: <Outlet />, // Add explicit Outlet to prevent TenantLayout from being used
    errorElement: <ErrorPage />,
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
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <AdminDashboardWrapper />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute requiredRole="viewer">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <UserProfilePage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <UsersPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "categories",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <CategoriesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "tags",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <TagsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "price-bands",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <PriceBandsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "places",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <PlacesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "towns",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <TownsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "legal",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <LegalPagesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "static-pages",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <StaticPagesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "tenants",
        element: HAS_MULTIPLE_TENANTS ? (
          <ProtectedRoute requiredRole="superadmin">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <TenantsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ) : (
          <NotFoundPage />
        ),
      },
      {
        path: "app-settings",
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <AppSettingsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "events",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <EventsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "event-log",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingSpinner isLoading={true} delay={0} />}>
              <AdminLayout>
                <EventLogPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Public tenant routes (with language prefix) - MUST come after admin routes
  ...createPublicRoutes(),

  { path: "*", element: <NotFoundPage /> },
]);

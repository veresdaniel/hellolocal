// src/app/routes.tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, useParams, Navigate } from "react-router-dom";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG } from "./config";
import { SiteLayout } from "./site/SiteLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RootRedirect } from "../components/RootRedirect";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { AdminPageSkeleton } from "../components/AdminPageSkeleton";
import { ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN, ROLE_SUPERADMIN } from "../types/enums";

// Public pages - loaded eagerly (main entry point)
import { HomePage } from "../pages/HomePage";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LegalPage } from "../pages/LegalPage";
import { PricingPage } from "../pages/PricingPage";
import { StaticPagesRouteGuard } from "../components/StaticPagesRouteGuard";
import { StaticPageDetailPage } from "../pages/StaticPageDetailPage";
import { SitesListPage } from "../pages/SitesListPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorPage } from "../pages/ErrorPage";
import { OfflinePage } from "../pages/OfflinePage";

// Auth pages - loaded eagerly (small, needed for login)
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";

// AdminLayout - eagerly loaded (layout component, should not be lazy loaded to prevent hook errors during navigation)
import { AdminLayout } from "../components/AdminLayout";

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
const GalleriesPage = lazy(() => import("../pages/admin/GalleriesPage").then(m => ({ default: m.GalleriesPage })));
const SitesPage = lazy(() => import("../pages/admin/SitesPage").then(m => ({ default: m.SitesPage })));
const SiteEditPage = lazy(() => import("../pages/admin/SiteEditPage").then(m => ({ default: m.SiteEditPage })));
const SubscriptionOverviewPage = lazy(() => import("../pages/admin/SubscriptionOverviewPage").then(m => ({ default: m.SubscriptionOverviewPage })));
const SubscriptionsDashboardPage = lazy(() => import("../pages/admin/SubscriptionsDashboardPage").then(m => ({ default: m.SubscriptionsDashboardPage })));
const BrandsPage = lazy(() => import("../pages/admin/BrandsPage").then(m => ({ default: m.BrandsPage })));
const SiteInstancesPage = lazy(() => import("../pages/admin/SiteInstancesPage").then(m => ({ default: m.SiteInstancesPage })));
const SiteMembershipsPage = lazy(() => import("../pages/admin/SiteMembershipsPage").then(m => ({ default: m.SiteMembershipsPage })));
const PlaceMembershipsPage = lazy(() => import("../pages/admin/PlaceMembershipsPage").then(m => ({ default: m.PlaceMembershipsPage })));
const PlacesPage = lazy(() => import("../pages/admin/PlacesPage").then(m => ({ default: m.PlacesPage })));
const PlacePriceListPage = lazy(() => import("../pages/admin/PlacePriceListPage").then(m => ({ default: m.PlacePriceListPage })));
const EventsPage = lazy(() => import("../pages/admin/EventsPage").then(m => ({ default: m.EventsPage })));
const AppSettingsPage = lazy(() => import("../pages/admin/AppSettingsPage").then(m => ({ default: m.AppSettingsPage })));
const EventLogPage = lazy(() => import("../pages/admin/EventLogPage").then(m => ({ default: m.EventLogPage })));
const SiteAnalyticsPage = lazy(() => import("../pages/admin/SiteAnalyticsPage").then(m => ({ default: m.SiteAnalyticsPage })));
const PlaceAnalyticsPage = lazy(() => import("../pages/admin/PlaceAnalyticsPage").then(m => ({ default: m.PlaceAnalyticsPage })));
const EventAnalyticsPage = lazy(() => import("../pages/admin/EventAnalyticsPage").then(m => ({ default: m.EventAnalyticsPage })));

// If multi-site is enabled, we need two separate routes
// Redirect component for old-style URLs (without siteKey) to default site
function RedirectToSiteRoute({ entityType }: { entityType: "place" | "event" }) {
  const { lang, slug } = useParams<{ lang: string; slug: string }>();
  if (!lang || !slug) return null;
  return <Navigate to={`/${lang}/${DEFAULT_SITE_SLUG}/${entityType}/${slug}`} replace />;
}

// One with site slug and one without
// IMPORTANT: These routes should NOT match /admin paths
const createPublicRoutes = () => {
  const baseChildren = [
    { index: true, element: <HomePage /> },
    { path: "place/:slug", element: <PlaceDetailPage /> },
    { path: "event/:slug", element: <EventDetailPage /> },
    { path: "static-pages", element: <StaticPagesRouteGuard /> },
    { path: "static-page/:id", element: <StaticPageDetailPage /> },
    // Sites page - use language from URL, not from path
    { path: "teruletek", element: <SitesListPage /> },
    { path: "regions", element: <SitesListPage /> },
    { path: "regionen", element: <SitesListPage /> },
    { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
    { path: "aszf", element: <LegalPage pageKey="terms" /> },
    { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
    { path: "pricing", element: <PricingPage /> },
    { path: "tarife", element: <PricingPage /> },
    { path: "preise", element: <PricingPage /> },
    { path: "offline", element: <OfflinePage /> },
  ];

  if (HAS_MULTIPLE_SITES) {
    // Multi-site mode: 
    // - /:lang route shows SitesListPage (site selection)
    // - /:lang/:siteKey route uses TenantLayout (specific site)
    // Backward compatibility: also support :tenantKey
    return [
      {
        // Route without siteKey - shows site selection page
        path: `/:lang`,
        element: <Outlet />,
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <SitesListPage /> },
          { path: "teruletek", element: <SitesListPage /> },
          { path: "regions", element: <SitesListPage /> },
          { path: "regionen", element: <SitesListPage /> },
          // Redirect old-style URLs (without siteKey) to default site
          { path: "place/:slug", element: <RedirectToSiteRoute entityType="place" /> },
          { path: "event/:slug", element: <RedirectToSiteRoute entityType="event" /> },
        ],
      },
      {
        // Route with siteKey - uses SiteLayout
        path: `/:lang/:siteKey`,
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
    ];
  } else {
    // Single site mode - just one route without siteKey
    return [
      {
        path: `/:lang`,
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
    ];
  }
};

export const router = createBrowserRouter([
  // root -> default nyelv (dynamically loaded from app settings)
  { path: "/", element: <RootRedirect /> },
  
  // Offline page - accessible without language prefix for service worker redirects
  { path: "/offline", element: <OfflinePage /> },
  
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
    element: <Outlet />, // Add explicit Outlet to prevent SiteLayout from being used
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
          <ProtectedRoute requiredRole={ROLE_VIEWER}>
            <Suspense fallback={<AdminPageSkeleton />}>
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
          <ProtectedRoute requiredRole={ROLE_VIEWER}>
            <Suspense fallback={<AdminPageSkeleton />}>
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
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <PlacesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "places/:placeId/pricelist",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <PlacePriceListPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "places/:placeId/analytics",
        element: (
          <ProtectedRoute requiredRole="editor" considerSiteRole={true}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <PlaceAnalyticsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "events/:eventId/analytics",
        element: (
          <ProtectedRoute requiredRole="editor" considerSiteRole={true}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <EventAnalyticsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "towns",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <StaticPagesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "galleries",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <GalleriesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "sites",
        element: HAS_MULTIPLE_SITES ? (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SitesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ) : (
          <NotFoundPage />
        ),
      },
      {
        path: "sites/:id/edit",
        element: HAS_MULTIPLE_SITES ? (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SiteEditPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ) : (
          <NotFoundPage />
        ),
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute requiredRole="editor" considerSiteRole={true}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SiteAnalyticsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "subscription-overview",
        element: HAS_MULTIPLE_SITES ? (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SubscriptionOverviewPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ) : (
          <NotFoundPage />
        ),
      },
      {
        path: "subscriptions",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SubscriptionsDashboardPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "brands",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <BrandsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "site-instances",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SiteInstancesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "site-memberships",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SiteMembershipsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "place-memberships",
        element: (
          <ProtectedRoute requiredRole={ROLE_ADMIN} considerSiteRole={true}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <PlaceMembershipsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "platform-settings",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
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
            <Suspense fallback={<AdminPageSkeleton />}>
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
          <ProtectedRoute requiredRole={ROLE_ADMIN} considerSiteRole={true}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <EventLogPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Public site routes (with language prefix) - MUST come after admin routes
  ...createPublicRoutes(),

  { path: "*", element: <NotFoundPage /> },
]);


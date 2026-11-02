// src/app/routes.tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, useParams, Navigate } from "react-router-dom";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang, isLang } from "./config";
import { SiteLayout } from "./site/SiteLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { DomainRedirect } from "../components/DomainRedirect";
import { RootRedirect } from "../components/RootRedirect";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { AdminPageSkeleton } from "../components/AdminPageSkeleton";
import { PlatformGaShell } from "../components/PlatformGaShell";
import { UnderConstructionGate } from "../components/UnderConstructionGate";
import { ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN, ROLE_SUPERADMIN } from "../types/enums";
import { PLACE_PATH_ALIASES, placeSegment, REGION_LIST_PATH } from "./entityPaths";
import { useAdminSite } from "../contexts/useAdminSite";

// Public entry / shell pages — keep eager (LCP, auth, error paths)
import { HomePage } from "../pages/HomePage";
import { SitesListPage } from "../pages/SitesListPage";
import { StaticPagesRouteGuard } from "../components/StaticPagesRouteGuard";
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

// Heavy public pages — route-level code split (SSR overview meta stays in server.js / renderOverview.js)
const PlaceDetailPage = lazy(() =>
  import("../pages/PlaceDetailPage").then((m) => ({ default: m.PlaceDetailPage }))
);
const EventDetailPage = lazy(() =>
  import("../pages/EventDetailPage").then((m) => ({ default: m.EventDetailPage }))
);
const LegalPage = lazy(() =>
  import("../pages/LegalPage").then((m) => ({ default: m.LegalPage }))
);
const PricingPage = lazy(() =>
  import("../pages/PricingPage").then((m) => ({ default: m.PricingPage }))
);
const OverviewPage = lazy(() =>
  import("../pages/OverviewPage").then((m) => ({ default: m.OverviewPage }))
);
const PublicPricingPage = lazy(() =>
  import("../pages/PublicPricingPage").then((m) => ({ default: m.PublicPricingPage }))
);
const StaticPageDetailPage = lazy(() =>
  import("../pages/StaticPageDetailPage").then((m) => ({ default: m.StaticPageDetailPage }))
);
const ProductsPage = lazy(() =>
  import("../pages/ProductsPage").then((m) => ({ default: m.ProductsPage }))
);

// Admin pages - lazy loaded (only needed when user is logged in)
const AdminDashboardWrapper = lazy(() =>
  import("../pages/admin/AdminDashboardWrapper").then((m) => ({ default: m.AdminDashboardWrapper }))
);
const UserProfilePage = lazy(() =>
  import("../pages/admin/UserProfilePage").then((m) => ({ default: m.UserProfilePage }))
);
const UsersPage = lazy(() =>
  import("../pages/admin/UsersPage").then((m) => ({ default: m.UsersPage }))
);
const CategoriesPage = lazy(() =>
  import("../pages/admin/CategoriesPage").then((m) => ({ default: m.CategoriesPage }))
);
const TagsPage = lazy(() =>
  import("../pages/admin/TagsPage").then((m) => ({ default: m.TagsPage }))
);
const PriceBandsPage = lazy(() =>
  import("../pages/admin/PriceBandsPage").then((m) => ({ default: m.PriceBandsPage }))
);
const TownsPage = lazy(() =>
  import("../pages/admin/TownsPage").then((m) => ({ default: m.TownsPage }))
);
const LegalPagesPage = lazy(() =>
  import("../pages/admin/LegalPagesPage").then((m) => ({ default: m.LegalPagesPage }))
);
const StaticPagesPage = lazy(() =>
  import("../pages/admin/StaticPagesPage").then((m) => ({ default: m.StaticPagesPage }))
);
const GalleriesPage = lazy(() =>
  import("../pages/admin/GalleriesPage").then((m) => ({ default: m.GalleriesPage }))
);
const ProductsAdminPage = lazy(() =>
  import("../pages/admin/ProductsAdminPage").then((m) => ({ default: m.ProductsAdminPage }))
);
const SitesPage = lazy(() =>
  import("../pages/admin/SitesPage").then((m) => ({ default: m.SitesPage }))
);
const SiteEditPage = lazy(() =>
  import("../pages/admin/SiteEditPage").then((m) => ({ default: m.SiteEditPage }))
);
const SubscriptionOverviewPage = lazy(() =>
  import("../pages/admin/SubscriptionOverviewPage").then((m) => ({
    default: m.SubscriptionOverviewPage,
  }))
);
const SubscriptionsDashboardPage = lazy(() =>
  import("../pages/admin/SubscriptionsDashboardPage").then((m) => ({
    default: m.SubscriptionsDashboardPage,
  }))
);
const DomainsPage = lazy(() =>
  import("../pages/admin/DomainsPage").then((m) => ({ default: m.DomainsPage }))
);
const CountriesPage = lazy(() =>
  import("../pages/admin/CountriesPage").then((m) => ({ default: m.CountriesPage }))
);
const SiteMembershipsPage = lazy(() =>
  import("../pages/admin/SiteMembershipsPage").then((m) => ({ default: m.SiteMembershipsPage }))
);
const PlaceMembershipsPage = lazy(() =>
  import("../pages/admin/PlaceMembershipsPage").then((m) => ({ default: m.PlaceMembershipsPage }))
);
const PlacesPage = lazy(() =>
  import("../pages/admin/PlacesPage").then((m) => ({ default: m.PlacesPage }))
);
const PlacePriceListPage = lazy(() =>
  import("../pages/admin/PlacePriceListPage").then((m) => ({ default: m.PlacePriceListPage }))
);
const EventsPage = lazy(() =>
  import("../pages/admin/EventsPage").then((m) => ({ default: m.EventsPage }))
);
const AppSettingsPage = lazy(() =>
  import("../pages/admin/AppSettingsPage").then((m) => ({ default: m.AppSettingsPage }))
);
const UiCopyPage = lazy(() =>
  import("../pages/admin/UiCopyPage").then((m) => ({ default: m.UiCopyPage }))
);
const I18nAdminPage = lazy(() =>
  import("../pages/admin/I18nAdminPage").then((m) => ({ default: m.I18nAdminPage }))
);
const EventLogPage = lazy(() =>
  import("../pages/admin/EventLogPage").then((m) => ({ default: m.EventLogPage }))
);
const SiteAnalyticsPage = lazy(() =>
  import("../pages/admin/SiteAnalyticsPage").then((m) => ({ default: m.SiteAnalyticsPage }))
);
const GlobalAnalyticsPage = lazy(() =>
  import("../pages/admin/GlobalAnalyticsPage").then((m) => ({ default: m.GlobalAnalyticsPage }))
);
const PlaceAnalyticsPage = lazy(() =>
  import("../pages/admin/PlaceAnalyticsPage").then((m) => ({ default: m.PlaceAnalyticsPage }))
);
const TownAnalyticsPage = lazy(() =>
  import("../pages/admin/TownAnalyticsPage").then((m) => ({ default: m.TownAnalyticsPage }))
);
const EventAnalyticsPage = lazy(() =>
  import("../pages/admin/EventAnalyticsPage").then((m) => ({ default: m.EventAnalyticsPage }))
);
const SiteStatusPage = lazy(() =>
  import("../pages/admin/SiteStatusPage").then((m) => ({ default: m.SiteStatusPage }))
);
const CollectionsPage = lazy(() =>
  import("../pages/admin/CollectionsPage").then((m) => ({ default: m.CollectionsPage }))
);
const CollectionEditPage = lazy(() =>
  import("../pages/admin/CollectionEditPage").then((m) => ({ default: m.CollectionEditPage }))
);
const CollectionDetailPage = lazy(() =>
  import("../pages/CollectionDetailPage").then((m) => ({ default: m.CollectionDetailPage }))
);

// Redirect URLs without region slug to the default region
function RedirectToSiteRoute({ entityType }: { entityType: "place" | "event" }) {
  const { lang, slug } = useParams<{ lang: string; slug: string }>();
  if (!lang || !slug) return null;
  const safeLang: Lang = isLang(lang) ? lang : "hu";
  const segment = entityType === "place" ? placeSegment(safeLang) : "event";
  return <Navigate to={`/${safeLang}/${DEFAULT_SITE_SLUG}/${segment}/${slug}`} replace />;
}

/** Admin alias: /admin/regions → /admin/sites (Site model kept; UI says Régió) */
function RedirectRegionsToSites() {
  const { lang, id } = useParams<{ lang: string; id?: string }>();
  if (!lang) return null;
  const tail = id ? `/sites/${id}/edit` : "/sites";
  return <Navigate to={`/${lang}/admin${tail}`} replace />;
}

/** Legacy /admin/site-instances → region edit Instances tab (or regions list) */
function RedirectSiteInstancesToRegion() {
  const { lang } = useParams<{ lang: string }>();
  const { selectedSiteId } = useAdminSite();
  if (!lang) return null;
  if (selectedSiteId) {
    return (
      <Navigate to={`/${lang}/admin/sites/${selectedSiteId}/edit?tab=instances`} replace />
    );
  }
  return <Navigate to={`/${lang}/admin/sites`} replace />;
}

/** Admin alias: /admin/analytics/region → /admin/analytics/site */
function RedirectRegionAnalytics() {
  const { lang } = useParams<{ lang: string }>();
  if (!lang) return null;
  return <Navigate to={`/${lang}/admin/analytics/site`} replace />;
}

const placeDetailRoutes = PLACE_PATH_ALIASES.map((segment) => ({
  path: `${segment}/:slug`,
  element: <PlaceDetailPage />,
}));

const townExploreRoutes = [
  { path: "town/:townSlug", element: <HomePage /> },
  { path: "telepules/:townSlug", element: <HomePage /> },
  { path: "gemeinde/:townSlug", element: <HomePage /> },
];

const regionListRoutes = [
  { path: REGION_LIST_PATH.hu, element: <SitesListPage /> },
  { path: REGION_LIST_PATH.en, element: <SitesListPage /> },
  { path: REGION_LIST_PATH.de, element: <SitesListPage /> },
  // Legacy Hungarian path — SitesListPage redirects to regiok
  { path: "teruletek", element: <SitesListPage /> },
];

// One with site slug (region key) and one without
// IMPORTANT: These routes should NOT match /admin paths
const createPublicRoutes = () => {
  const baseChildren = [
    { index: true, element: <HomePage /> },
    ...placeDetailRoutes,
    ...townExploreRoutes,
    { path: "event/:slug", element: <EventDetailPage /> },
    { path: "static-pages", element: <StaticPagesRouteGuard /> },
    { path: "products", element: <ProductsPage /> },
    { path: "static-page/:id", element: <StaticPageDetailPage /> },
    ...regionListRoutes,
    { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
    { path: "aszf", element: <LegalPage pageKey="terms" /> },
    { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
    { path: "pricing", element: <PricingPage /> },
    { path: "tarife", element: <PricingPage /> },
    { path: "preise", element: <PricingPage /> },
    { path: "overview", element: <OverviewPage /> },
    { path: "offline", element: <OfflinePage /> },
  ];

  if (HAS_MULTIPLE_SITES) {
    // Multi-site mode:
    // - /:lang → marketing overview (public opener)
    // - /:lang/:siteKey → region map/list (Prisma Site slug)
    // Region list stays at regiok / regions / regionen.
    return [
      {
        path: `/:lang`,
        element: (
          <>
            <DomainRedirect />
            <Outlet />
          </>
        ),
        errorElement: <ErrorPage />,
        children: [
          {
            element: <PlatformGaShell />,
            children: [
              { index: true, element: <OverviewPage /> },
              ...regionListRoutes,
              { path: "overview", element: <OverviewPage /> },
              { path: "pricing", element: <PublicPricingPage /> },
              { path: "tarife", element: <PublicPricingPage /> },
              { path: "preise", element: <PublicPricingPage /> },
              { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
              { path: "aszf", element: <LegalPage pageKey="terms" /> },
              { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
              ...PLACE_PATH_ALIASES.map((segment) => ({
                path: `${segment}/:slug`,
                element: <RedirectToSiteRoute entityType="place" />,
              })),
              { path: "event/:slug", element: <RedirectToSiteRoute entityType="event" /> },
            ],
          },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
          {
            path: "collections/:slug",
            element: <SiteLayout />,
            children: [{ path: "", element: <CollectionDetailPage /> }],
          },
        ],
      },
      {
        // siteKey = public region slug
        path: `/:lang/:siteKey`,
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: baseChildren,
      },
    ];
  } else {
    return [
      {
        path: `/:lang`,
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
          ...baseChildren,
        ],
      },
    ];
  }
};

export const router = createBrowserRouter([
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
  // (and outside UnderConstructionGate so admin stays open when the public site is locked)
  {
    path: `/:lang/admin`,
    element: <Outlet />, // Add explicit Outlet to prevent SiteLayout from being used
    errorElement: <ErrorPage />,
    children: [
      {
        // Auth pages use platform-wide GA (consent-gated), not site IDs
        element: <PlatformGaShell />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
        ],
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
          <ProtectedRoute requiredRole="editor" scopeGate="regionEditor">
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
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
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
          <ProtectedRoute requiredRole="viewer" scopeGate="places">
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
        path: "towns/:townId/analytics",
        element: (
          <ProtectedRoute requiredRole="viewer" scopeGate="towns">
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <TownAnalyticsPage />
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
          <ProtectedRoute requiredRole="viewer" scopeGate="ownTowns">
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
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
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
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
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
        path: "products",
        element: (
          <ProtectedRoute requiredRole="editor">
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <ProductsAdminPage />
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
      // Additive aliases: UI says Régió / Region; Prisma model stays Site
      { path: "regions", element: <RedirectRegionsToSites /> },
      { path: "regions/:id/edit", element: <RedirectRegionsToSites /> },
      {
        path: "collections",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <CollectionsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "collections/:id/edit",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <CollectionEditPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "collections/new",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <CollectionEditPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <GlobalAnalyticsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics/site",
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
      { path: "analytics/region", element: <RedirectRegionAnalytics /> },
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
        path: "countries",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <CountriesPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "domains",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <DomainsPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        // Legacy global Site Instances → Régió edit Instances tab
        path: "site-instances",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <RedirectSiteInstancesToRegion />
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
          <ProtectedRoute requiredRole={ROLE_ADMIN} considerSiteRole={true} scopeGate="regionAdmin">
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
        path: "i18n",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <I18nAdminPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "ui-copy",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <UiCopyPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "events",
        element: (
          <ProtectedRoute requiredRole="viewer" scopeGate="events">
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
          <ProtectedRoute requiredRole="viewer" scopeGate="places">
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <EventLogPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "site-status",
        element: (
          <ProtectedRoute requiredRole={ROLE_SUPERADMIN}>
            <Suspense fallback={<AdminPageSkeleton />}>
              <AdminLayout>
                <SiteStatusPage />
              </AdminLayout>
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Public site routes — under-development gate (admin routes above stay open)
  {
    element: <UnderConstructionGate />,
    children: [
      { path: "/", element: <RootRedirect /> },
      ...createPublicRoutes(),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

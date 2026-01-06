// src/app/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS, DEFAULT_LANG } from "./config";
import { TenantLayout } from "./tenant/TenantLayout";

import { HomePage } from "../pages/HomePage";
import { ExplorePage } from "../pages/ExplorePage";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";
import { StaticPage } from "../pages/StaticPage";

const tenantPrefix = HAS_MULTIPLE_TENANTS ? "/:tenantSlug" : "";

export const router = createBrowserRouter([
  // root -> default nyelv
  { path: "/", element: <Navigate to={`/${DEFAULT_LANG}`} replace /> },

  {
    path: `${tenantPrefix}/:lang`,
    element: <TenantLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "place/:slug", element: <PlaceDetailPage /> },

      { path: "impresszum", element: <StaticPage pageKey="imprint" /> },
      { path: "aszf", element: <StaticPage pageKey="terms" /> },
      { path: "adatvedelem", element: <StaticPage pageKey="privacy" /> },
    ],
  },

  { path: "*", element: <div style={{ padding: 24 }}>404</div> },
]);

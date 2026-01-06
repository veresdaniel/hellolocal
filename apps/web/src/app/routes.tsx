// src/app/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS, DEFAULT_LANG } from "./config";
import { TenantLayout } from "./tenant/TenantLayout";

import { HomePage } from "../pages/HomePage";
import { ExplorePage } from "../pages/ExplorePage";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";
import { LegalPage } from "../pages/LegalPage";

const tenantSuffix = HAS_MULTIPLE_TENANTS ? "/:tenantSlug" : "";

export const router = createBrowserRouter([
  // root -> default nyelv
  { path: "/", element: <Navigate to={`/${DEFAULT_LANG}`} replace /> },

  {
    path: `/:lang${tenantSuffix}`,
    element: <TenantLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "place/:slug", element: <PlaceDetailPage /> },

      { path: "impresszum", element: <LegalPage pageKey="imprint" /> },
      { path: "aszf", element: <LegalPage pageKey="terms" /> },
      { path: "adatvedelem", element: <LegalPage pageKey="privacy" /> },
    ],
  },

  { path: "*", element: <div style={{ padding: 24 }}>404</div> },
]);

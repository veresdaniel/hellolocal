// src/app/tenant/TenantLayout.tsx
import { Outlet, useParams, Navigate, useLocation } from "react-router-dom";
import {
  APP_LANGS,
  DEFAULT_TENANT_SLUG,
  HAS_MULTIPLE_TENANTS,
  type Lang,
} from "../config";
import { Footer } from "../../ui/layout/Footer";
import { usePublicDefaultLanguage } from "../../hooks/usePublicDefaultLanguage";
import { PublicAuthBadge } from "../../components/PublicAuthBadge";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function TenantLayout() {
  const { lang: langParam, tenantSlug: tenantParam } = useParams<{
    lang?: Lang;
    tenantSlug?: string;
  }>();
  const location = useLocation();
  const defaultLangFromSettings = usePublicDefaultLanguage();

  const lang: Lang = isLang(langParam) ? langParam : defaultLangFromSettings;

  // single-tenant módban mindig default tenant
  const tenantSlug = HAS_MULTIPLE_TENANTS
    ? tenantParam ?? DEFAULT_TENANT_SLUG
    : DEFAULT_TENANT_SLUG;

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang) {
    const base = HAS_MULTIPLE_TENANTS ? `/${lang}/${tenantSlug}` : `/${lang}`;
    return <Navigate to={base} replace />;
  }

  // Check if we're on the home page (where footer is handled internally)
  const isHomePage = location.pathname === `/${lang}` || 
                     (HAS_MULTIPLE_TENANTS && location.pathname === `/${lang}/${tenantSlug}`);

  // Header (logo island) is now rendered by HomePage when in map view
  // FloatingHeader is rendered by PlacesListView and PlaceDetailPage

  // Itt később tölthetsz tenant configot (React Queryvel), de MVP-ben elég, ha csak továbbadod.
  return (
    <div 
      style={{ 
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        margin: 0, 
        padding: 0,
        width: "100%",
      }}
    >
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div style={{ flex: 1, margin: 0, padding: 0, width: "100%", display: "flex", flexDirection: "column" }}>
        <Outlet context={{ lang, tenantSlug }} />
      </div>
      {!isHomePage && <Footer lang={lang} tenantSlug={tenantSlug} />}
      <PublicAuthBadge />
    </div>
  );
}

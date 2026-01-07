// src/app/tenant/TenantLayout.tsx
import { Outlet, useParams, Navigate } from "react-router-dom";
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

  // Header (logo island) is now rendered by HomePage when in map view
  // FloatingHeader is rendered by PlacesListView and PlaceDetailPage

  // Itt később tölthetsz tenant configot (React Queryvel), de MVP-ben elég, ha csak továbbadod.
  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        margin: 0, 
        padding: 0,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
    >
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
      <div className="flex-1" style={{ margin: 0, padding: 0, width: "100%", height: "100%" }}>
        <Outlet context={{ lang, tenantSlug }} />
      </div>
      <Footer lang={lang} tenantSlug={tenantSlug} />
      <PublicAuthBadge />
    </div>
  );
}

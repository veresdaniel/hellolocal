// src/app/tenant/TenantLayout.tsx
import { Outlet, useParams, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  APP_LANGS,
  DEFAULT_TENANT_SLUG,
  HAS_MULTIPLE_TENANTS,
  type Lang,
} from "../config";
import { Footer } from "../../ui/layout/Footer";
import { usePublicDefaultLanguage } from "../../hooks/usePublicDefaultLanguage";
import { PublicAuthBadge } from "../../components/PublicAuthBadge";
import { useActiveTenantsCount } from "../../hooks/useActiveTenantsCount";
import { useVersionCheck } from "../../hooks/useVersionCheck";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function TenantLayout() {
  const { lang: langParam, tenantSlug: tenantParam } = useParams<{
    lang?: Lang;
    tenantSlug?: string;
  }>();
  const location = useLocation();
  
  // Skip tenant logic entirely for admin routes
  // Admin routes should be handled by their own layout  
  if (location.pathname.includes('/admin')) {
    // Return null - admin routes have their own layout structure
    return null;
  }
  
  const { i18n } = useTranslation();
  const defaultLangFromSettings = usePublicDefaultLanguage();
  const { data: tenantsCountData, isLoading: isLoadingTenantsCount } = useActiveTenantsCount();
  
  // Version check for public pages - will check for updates and show toast if new version available
  useVersionCheck();

  const lang: Lang = isLang(langParam) ? langParam : defaultLangFromSettings;

  // Sync i18n language with URL parameter (URL is source of truth for public pages)
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // Determine if we should show tenant slug in URL
  // If multi-tenant is enabled but only one tenant exists, hide tenant slug from URL
  const shouldShowTenantSlug = HAS_MULTIPLE_TENANTS && (tenantsCountData?.count ?? 0) > 1;

  // single-tenant módban mindig default tenant
  // multi-tenant módban: ha csak egy tenant van, ne mutassuk az URL-ben
  const tenantSlug = HAS_MULTIPLE_TENANTS
    ? tenantParam ?? DEFAULT_TENANT_SLUG
    : DEFAULT_TENANT_SLUG;

  // Multi-tenant módban: ha több tenant van és nincs tenant slug az URL-ben, redirect a default tenant-ra
  // Ha csak egy tenant van, ne redirectáljunk (hagyjuk, hogy az URL-ben ne legyen tenant slug)
  if (HAS_MULTIPLE_TENANTS && shouldShowTenantSlug && !tenantParam && langParam === lang && !isLoadingTenantsCount) {
    return <Navigate to={`/${lang}/${DEFAULT_TENANT_SLUG}`} replace />;
  }

  // Ha csak egy tenant van és van tenant slug az URL-ben, redirectáljunk anélkül
  if (HAS_MULTIPLE_TENANTS && !shouldShowTenantSlug && tenantParam && langParam === lang && !isLoadingTenantsCount) {
    return <Navigate to={`/${lang}`} replace />;
  }

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang && !isLoadingTenantsCount) {
    const base = shouldShowTenantSlug ? `/${lang}/${tenantSlug}` : `/${lang}`;
    return <Navigate to={base} replace />;
  }

  // Check if we're on the home page (where footer is handled internally)
  const isHomePage = location.pathname === `/${lang}` || 
                     (shouldShowTenantSlug && location.pathname === `/${lang}/${tenantSlug}`);

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

// src/app/tenant/TenantLayout.tsx
import { Outlet, useParams, Navigate } from "react-router-dom";
import {
  APP_LANGS,
  DEFAULT_LANG,
  DEFAULT_TENANT_SLUG,
  HAS_MULTIPLE_TENANTS,
  type Lang,
} from "../config";
import { Footer } from "../../ui/layout/Footer";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function TenantLayout() {
  const params = useParams();
  const langParam = params.lang;
  const tenantParam = params.tenantSlug;

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // single-tenant módban mindig default tenant
  const tenantSlug = HAS_MULTIPLE_TENANTS
    ? tenantParam ?? DEFAULT_TENANT_SLUG
    : DEFAULT_TENANT_SLUG;

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang) {
    const prefix = HAS_MULTIPLE_TENANTS ? `/${tenantSlug}` : "";
    return <Navigate to={`${prefix}/${lang}`} replace />;
  }

  // Itt később tölthetsz tenant configot (React Queryvel), de MVP-ben elég, ha csak továbbadod.
  return (
    <div className="min-h-screen flex flex-col">
      {/* ide később jöhet Header */}
      <div className="flex-1">
        <Outlet context={{ lang, tenantSlug }} />
      </div>
      <Footer lang={lang} tenantSlug={tenantSlug} />
    </div>
  );
}

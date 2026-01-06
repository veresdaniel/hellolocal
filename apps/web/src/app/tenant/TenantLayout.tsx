// src/app/tenant/TenantLayout.tsx
import { Outlet, useParams, Navigate } from "react-router-dom";
import { APP_LANGS, DEFAULT_LANG, DEFAULT_TENANT_SLUG, HAS_MULTIPLE_TENANTS, type Lang } from "../config";

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
    ? (tenantParam ?? DEFAULT_TENANT_SLUG)
    : DEFAULT_TENANT_SLUG;

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang) {
    const prefix = HAS_MULTIPLE_TENANTS ? `/${tenantSlug}` : "";
    return <Navigate to={`${prefix}/${lang}`} replace />;
  }

  // Itt később tölthetsz tenant configot (React Queryvel), de MVP-ben elég, ha csak továbbadod.
  return (
    <div>
      {/* ide jöhet Header, Footer */}
      <Outlet context={{ lang, tenantSlug }} />
    </div>
  );
}

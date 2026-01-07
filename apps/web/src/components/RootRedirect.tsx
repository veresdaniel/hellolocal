// src/components/RootRedirect.tsx
import { Navigate } from "react-router-dom";
import { usePublicDefaultLanguage } from "../hooks/usePublicDefaultLanguage";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG } from "../app/config";

export function RootRedirect() {
  const defaultLang = usePublicDefaultLanguage();
  const path = HAS_MULTIPLE_TENANTS ? `/${defaultLang}/${DEFAULT_TENANT_SLUG}` : `/${defaultLang}`;
  return <Navigate to={path} replace />;
}


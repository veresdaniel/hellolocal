// src/pages/NotFoundPage.tsx
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG } from "../app/config";
import { useActiveTenantsCount } from "../hooks/useActiveTenantsCount";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: tenantsCountData } = useActiveTenantsCount();

  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Determine if we should show tenant slug in URL
  const shouldShowTenantSlug = HAS_MULTIPLE_TENANTS && (tenantsCountData?.count ?? 0) > 1;
  const tenantSlug = shouldShowTenantSlug ? DEFAULT_TENANT_SLUG : undefined;

  // Build home path
  const homePath = tenantSlug ? `/${lang}/${tenantSlug}` : `/${lang}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
      }}
    >
      <div style={{ maxWidth: 600 }}>
        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 120px)",
            fontWeight: 700,
            margin: 0,
            color: "#667eea",
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 600,
            margin: 0,
            color: "#1a1a1a",
            marginBottom: 16,
          }}
        >
          {t("error.pageNotFound")}
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            color: "#666",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          {t("error.pageNotFoundDescription")}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to={homePath}
            style={{
              padding: "12px 24px",
              background: "#667eea",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 16,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#5568d3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#667eea";
            }}
          >
            {t("error.goHome")}
          </Link>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "12px 24px",
              background: "white",
              color: "#667eea",
              border: "2px solid #667eea",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 16,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f0ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            {t("error.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
}

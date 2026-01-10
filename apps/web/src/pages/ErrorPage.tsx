// src/pages/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG } from "../app/config";
import { useActiveTenantsCount } from "../hooks/useActiveTenantsCount";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ErrorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const error = useRouteError();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: tenantsCountData } = useActiveTenantsCount();

  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Determine if we should show tenant slug in URL
  const shouldShowTenantSlug = HAS_MULTIPLE_TENANTS && (tenantsCountData?.count ?? 0) > 1;
  const tenantSlug = shouldShowTenantSlug ? DEFAULT_TENANT_SLUG : undefined;

  // Build home path
  const homePath = tenantSlug ? `/${lang}/${tenantSlug}` : `/${lang}`;

  // Extract error information
  let statusCode: number | undefined;
  let errorMessage: string;
  let errorDetails: any = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.statusText || t("error.unknownError");
    if (error.data) {
      if (typeof error.data === "string") {
        errorMessage = error.data;
      } else if (typeof error.data === "object" && error.data !== null) {
        const data = error.data as any;
        errorMessage = data.message || error.statusText || t("error.unknownError");
        errorDetails = data;
      }
    }
  } else if (error instanceof Error) {
    errorMessage = error.message || t("error.unknownError");
    // Try to extract status code from error message if it contains one
    const statusMatch = error.message.match(/\b(\d{3})\b/);
    if (statusMatch) {
      statusCode = parseInt(statusMatch[1], 10);
    }
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    statusCode = err.status || err.statusCode || err.status;
    errorMessage = err.message || err.error || t("error.unknownError");
    errorDetails = err;
  } else {
    errorMessage = t("error.unknownError");
  }

  // Default status code if not found
  if (!statusCode) {
    statusCode = 500;
  }

  // Get error title based on status code
  const getErrorTitle = (code: number): string => {
    switch (code) {
      case 400:
        return t("error.badRequest");
      case 401:
        return t("error.unauthorized");
      case 403:
        return t("error.forbidden");
      case 404:
        return t("error.notFound");
      case 500:
        return t("error.internalServerError");
      case 502:
        return t("error.badGateway");
      case 503:
        return t("error.serviceUnavailable");
      default:
        return t("error.errorOccurred");
    }
  };

  const errorTitle = getErrorTitle(statusCode);

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
      <div style={{ maxWidth: 700 }}>
        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 120px)",
            fontWeight: 700,
            margin: 0,
            color: statusCode >= 500 ? "#dc3545" : statusCode >= 400 ? "#ffc107" : "#667eea",
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          {statusCode}
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
          {errorTitle}
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            color: "#666",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {errorMessage}
        </p>

        {/* Show error details in development mode */}
        {process.env.NODE_ENV !== "production" && errorDetails && (
          <details
            style={{
              marginBottom: 32,
              padding: 16,
              background: "#f8f9fa",
              borderRadius: 8,
              textAlign: "left",
              maxWidth: "100%",
              overflow: "auto",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 500,
                color: "#666",
                marginBottom: 8,
              }}
            >
              {t("error.errorDetails")}
            </summary>
            <pre
              style={{
                fontSize: 12,
                color: "#333",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {JSON.stringify(errorDetails, null, 2)}
            </pre>
          </details>
        )}

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
          <button
            onClick={() => window.location.reload()}
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
            {t("error.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}

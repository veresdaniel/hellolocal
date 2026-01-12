// src/pages/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link, useNavigate, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG } from "../app/config";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";
import { isTokenExpired } from "../utils/tokenUtils";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ErrorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const error = useRouteError();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: sitesCountData } = useActiveSitesCount();
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);

  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
  // Check if we're in admin area and if session might be expired
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isInAdminArea = currentPath.includes('/admin') && !currentPath.includes('/admin/login');
    
    if (isInAdminArea) {
      const accessToken = localStorage.getItem("accessToken");
      const refreshTokenValue = localStorage.getItem("refreshToken");
      
      // If no tokens or both tokens expired, likely session issue
      const hasNoTokens = !accessToken && !refreshTokenValue;
      const bothTokensExpired = accessToken && isTokenExpired(accessToken) && 
                                 (!refreshTokenValue || isTokenExpired(refreshTokenValue));
      
      if (hasNoTokens || bothTokensExpired) {
        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.setItem("sessionExpired", "true");
        setShouldRedirectToLogin(true);
      }
    }
  }, []);

  // Determine if we should show site slug in URL
  const shouldShowSiteSlug = HAS_MULTIPLE_SITES && (sitesCountData?.count ?? 0) > 1;
  const siteSlug = shouldShowSiteSlug ? DEFAULT_SITE_SLUG : undefined;

  // Build home path
  const homePath = siteSlug ? `/${lang}/${siteSlug}` : `/${lang}`;

  // Extract error information
  let statusCode: number | undefined;
  let errorMessage: string;
  let errorDetails: any = null;
  let isBackendError = false;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    isBackendError = true; // RouteErrorResponse is from backend/API
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
    // JavaScript/Client-side errors - only show for non-5xx errors
    // For 5xx errors, we should only show backend errors
    const statusMatch = error.message.match(/\b(\d{3})\b/);
    if (statusMatch) {
      const extractedStatus = parseInt(statusMatch[1], 10);
      if (extractedStatus >= 500) {
        // This is likely a client-side error trying to mimic a 5xx
        // Don't show it for 5xx errors - only show backend errors
        statusCode = 500;
        errorMessage = t("error.internalServerError");
        isBackendError = false;
      } else {
        statusCode = extractedStatus;
        errorMessage = error.message || t("error.unknownError");
        isBackendError = false;
      }
    } else {
      // No status code in error - this is a client-side JS error
      // For 5xx errors, don't show client-side errors
      statusCode = 500;
      errorMessage = t("error.internalServerError");
      isBackendError = false;
    }
  } else if (typeof error === "object" && error !== null) {
    const err = error as any;
    statusCode = err.status || err.statusCode || err.status;
    // Check if this looks like a backend error (has statusCode and message structure)
    isBackendError = !!(statusCode && (err.message || err.error));
    errorMessage = err.message || err.error || t("error.unknownError");
    errorDetails = err;
  } else {
    errorMessage = t("error.unknownError");
  }

  // Default status code if not found
  if (!statusCode) {
    statusCode = 500;
  }

  // For 5xx errors, only show backend errors, not client-side JS errors
  if (statusCode >= 500 && !isBackendError) {
    errorMessage = t("error.internalServerError");
    errorDetails = null; // Don't show JS error details for 5xx
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

  // Determine gradient and colors based on status code
  const getErrorTheme = (code: number) => {
    if (code >= 500) {
      return {
        gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        accentColor: "rgba(255, 255, 255, 0.2)",
        textColor: "white",
      };
    } else if (code === 404) {
      return {
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        accentColor: "rgba(255, 255, 255, 0.2)",
        textColor: "white",
      };
    } else if (code >= 400) {
      return {
        gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        accentColor: "#fed7aa",
        textColor: "white",
      };
    } else {
      return {
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        accentColor: "rgba(255, 255, 255, 0.2)",
        textColor: "white",
      };
    }
  };

  const theme = getErrorTheme(statusCode);
  
  // Redirect to login if session expired in admin area
  if (shouldRedirectToLogin) {
    return <Navigate to={`/${lang}/admin/login`} replace />;
  }

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
        background: theme.gradient,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "float 20s infinite linear",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: "300px",
          height: "300px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "pulse 4s infinite ease-in-out",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          width: "200px",
          height: "200px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(30px)",
          animation: "pulse 6s infinite ease-in-out",
          animationDelay: "2s",
        }}
      />

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(-50px, -50px) rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
        `}
      </style>

      <div
        style={{
          maxWidth: 700,
          position: "relative",
          zIndex: 1,
          animation: "slideIn 0.6s ease-out",
        }}
      >
        <div
          style={{
            fontSize: "clamp(120px, 20vw, 200px)",
            fontWeight: 900,
            margin: 0,
            color: "rgba(255, 255, 255, 0.95)",
            lineHeight: 1,
            marginBottom: 16,
            textShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            animation: statusCode >= 500 ? "shake 0.5s ease-in-out" : "none",
            letterSpacing: "-0.05em",
            WebkitTextStroke: "2px rgba(255, 255, 255, 0.3)",
          }}
        >
          {statusCode}
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            margin: 0,
            color: theme.textColor,
            marginBottom: 16,
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          }}
        >
          {errorTitle}
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 40,
            lineHeight: 1.6,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
              padding: "14px 32px",
              background: "white",
              color: statusCode === 404 ? "#667eea" : "#667eea",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
            }}
          >
            {t("error.goHome")}
          </Link>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "14px 32px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.8)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {t("error.goBack")}
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "14px 32px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.8)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {t("error.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}

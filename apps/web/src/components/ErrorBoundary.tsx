// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES, type Lang, isLang } from "../app/config";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";
import { devLog } from "../lib/devLog";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    devLog.error("[ErrorBoundary] caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ServerErrorFallback
          stack={import.meta.env.DEV ? this.state.error?.stack : undefined}
        />
      );
    }

    return this.props.children;
  }
}

/** Dedicated 500 experience — distinct from NotFoundPage (404) and EmptyResults. */
function ServerErrorFallback({ stack }: { stack?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: sitesCountData } = useActiveSitesCount();

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const shouldShowSiteSlug = HAS_MULTIPLE_SITES && (sitesCountData?.count ?? 0) > 1;
  const siteSlug = shouldShowSiteSlug ? DEFAULT_SITE_SLUG : undefined;
  const homePath = siteSlug ? `/${lang}/${siteSlug}` : `/${lang}`;

  const theme = {
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    textColor: "white",
  };

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

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(-50px, -50px) rotate(360deg); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
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
            animation: "shake 0.5s ease-in-out",
            letterSpacing: "-0.05em",
            WebkitTextStroke: "2px rgba(255, 255, 255, 0.3)",
          }}
        >
          500
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
          {t("error.internalServerError")}
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
          {t("error.serverErrorDescription")}
        </p>
        {import.meta.env.DEV && stack && (
          <details
            style={{
              marginBottom: 32,
              padding: 16,
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: 8,
              textAlign: "left",
              maxWidth: "100%",
              overflow: "auto",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: 8,
              }}
            >
              {t("error.errorDetails")}
            </summary>
            <pre
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Monaco', 'Courier New', monospace",
                color: "rgba(255, 255, 255, 0.9)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {stack}
            </pre>
          </details>
        )}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to={homePath}
            style={{
              padding: "14px 32px",
              background: "white",
              color: "#6366f1",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              display: "inline-block",
            }}
          >
            {t("error.goHome")}
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "14px 32px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
            }}
          >
            {t("error.goBack")}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "14px 32px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
            }}
          >
            {t("error.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}

// src/pages/NotFoundPage.tsx
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG } from "../app/config";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { data: sitesCountData } = useActiveSitesCount();

  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Determine if we should show site slug in URL
  const shouldShowSiteSlug = HAS_MULTIPLE_SITES && (sitesCountData?.count ?? 0) > 1;
  const siteSlug = shouldShowSiteSlug ? DEFAULT_SITE_SLUG : undefined;

  // Build home path
  const homePath = siteSlug ? `/${lang}/${siteSlug}` : `/${lang}`;

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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}
      </style>

      <div
        style={{
          maxWidth: 600,
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
            animation: "bounce 2s infinite ease-in-out",
            letterSpacing: "-0.05em",
            WebkitTextStroke: "2px rgba(255, 255, 255, 0.3)",
          }}
        >
          404
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            margin: 0,
            color: "white",
            marginBottom: 16,
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          }}
        >
          {t("error.pageNotFound")}
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
          {t("error.pageNotFoundDescription")}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to={homePath}
            style={{
              padding: "14px 32px",
              background: "white",
              color: "#667eea",
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
        </div>
      </div>
    </div>
  );
}

// src/pages/OfflinePage.tsx
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";
import { HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG } from "../app/config";
import { useActiveSitesCount } from "../hooks/useActiveSitesCount";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function OfflinePage() {
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

  // Modest theme - softer colors than error page
  const theme = {
    gradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
    accentColor: "rgba(255, 255, 255, 0.15)",
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
      {/* Subtle animated background elements - more modest than error page */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "float 25s infinite linear",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: "250px",
          height: "250px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "50%",
          filter: "blur(50px)",
          animation: "pulse 5s infinite ease-in-out",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          width: "180px",
          height: "180px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "pulse 7s infinite ease-in-out",
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
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.15); opacity: 0.6; }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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
            fontSize: "clamp(80px, 15vw, 140px)",
            fontWeight: 700,
            margin: 0,
            color: "rgba(255, 255, 255, 0.9)",
            lineHeight: 1,
            marginBottom: 24,
            textShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
            letterSpacing: "-0.03em",
          }}
        >
          📡
        </div>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 600,
            margin: 0,
            color: theme.textColor,
            marginBottom: 16,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          {t("offline.title")}
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 18px)",
            color: "rgba(255, 255, 255, 0.85)",
            marginBottom: 12,
            lineHeight: 1.6,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          {t("offline.message")}
        </p>
        <p
          style={{
            fontSize: "clamp(14px, 2.5vw, 16px)",
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: 40,
            lineHeight: 1.5,
            fontStyle: "italic",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          }}
        >
          {t("offline.joke")}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px",
              background: "white",
              color: "#4b5563",
              border: "none",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: 15,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 3px 12px rgba(0, 0, 0, 0.15)",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 5px 16px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 3px 12px rgba(0, 0, 0, 0.15)";
            }}
          >
            {t("offline.retry")}
          </button>
          <Link
            to={homePath}
            style={{
              padding: "12px 28px",
              background: "rgba(255, 255, 255, 0.15)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: 15,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.6)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {t("error.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

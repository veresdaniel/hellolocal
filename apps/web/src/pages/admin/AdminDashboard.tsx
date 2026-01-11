// src/pages/admin/AdminDashboard.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Link, useParams } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../../app/config";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { lang: langParam } = useParams<{ lang?: string }>();
  usePageTitle("admin.dashboard");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;
  
  // Determine if EventLog card should be shown
  const showEventLog = user && (user.role === "superadmin" || user.role === "admin");
  
  // Debug: Log render info

  return (
    <div>
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1 style={{ 
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          color: "#e0e0ff",
          margin: 0,
          marginBottom: 8,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.dashboard")}
        </h1>
        <p style={{ 
          fontSize: "clamp(13px, 3vw, 14px)",
          color: "#c0c0d0",
          margin: 0,
          textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
        }}>
          {t("admin.dashboardWelcome")}
        </p>
      </div>

      <div style={{ 
        display: "grid",
        gridTemplateColumns: isMobile 
          ? "repeat(auto-fit, minmax(85px, 1fr))" 
          : isTablet
          ? "repeat(auto-fit, minmax(180px, 1fr))"
          : "repeat(auto-fit, minmax(240px, 1fr))",
        gap: isMobile ? "12px" : "clamp(16px, 3vw, 24px)",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}>
        <DashboardCard
          title={t("admin.dashboardCards.events")}
          description={t("admin.dashboardCards.eventsDesc")}
          link={adminPath("/events")}
          icon="📅"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.places")}
          description={t("admin.dashboardCards.placesDesc")}
          link={adminPath("/places")}
          icon="📍"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.priceBands")}
          description={t("admin.dashboardCards.priceBandsDesc")}
          link={adminPath("/price-bands")}
          icon="💰"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.categories")}
          description={t("admin.dashboardCards.categoriesDesc")}
          link={adminPath("/categories")}
          icon="📁"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.tags")}
          description={t("admin.dashboardCards.tagsDesc")}
          link={adminPath("/tags")}
          icon="🏷️"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.towns")}
          description={t("admin.dashboardCards.townsDesc")}
          link={adminPath("/towns")}
          icon="🏘️"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.legalPages")}
          description={t("admin.dashboardCards.legalPagesDesc")}
          link={adminPath("/legal")}
          icon="📄"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.staticPages")}
          description={t("admin.dashboardCards.staticPagesDesc")}
          link={adminPath("/static-pages")}
          icon="📝"
          isMobile={isMobile}
        />
        <DashboardCard
          title={t("admin.dashboardCards.userProfile")}
          description={t("admin.dashboardCards.userProfileDesc")}
          link={adminPath("/profile")}
          icon="👤"
          isMobile={isMobile}
        />
        {showEventLog && (
          <DashboardCard
            title={t("admin.dashboardCards.eventLog")}
            description={t("admin.dashboardCards.eventLogDesc")}
            link={adminPath("/event-log")}
            icon="📋"
            isMobile={isMobile}
          />
        )}
      </div>

    </div>
  );
}

function DashboardCard({
  title,
  description,
  link,
  icon,
  isMobile = false,
}: {
  title: string;
  description: string;
  link: string;
  icon: string;
  isMobile?: boolean;
}) {
  // Mobile: iPhone-style small icon-only cards
  if (isMobile) {
    return (
      <Link
        to={link}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          aspectRatio: "1",
          background: "linear-gradient(135deg, #3a3456 0%, #2d2a4a 100%)",
          borderRadius: 16,
          textDecoration: "none",
          color: "white",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)",
          border: "1px solid rgba(102, 126, 234, 0.3)",
          position: "relative",
          padding: 8,
          boxSizing: "border-box",
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = "scale(0.95)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)";
        }}
      >
        <div style={{ 
          fontSize: "clamp(26px, 6vw, 32px)",
          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: "clamp(12px, 2.8vw, 14px)",
          fontWeight: 600,
          color: "#a8b3ff",
          textAlign: "center",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          width: "100%",
          wordBreak: "break-word",
          hyphens: "auto",
        }}>
          {title}
        </div>
      </Link>
    );
  }

  // Desktop: Original card style with title and description
  return (
    <Link
      to={link}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "clamp(10px, 2vw, 12px)",
        padding: "clamp(10px, 2vw, 12px)",
        background: "linear-gradient(135deg, #3a3456 0%, #2d2a4a 100%)",
        borderRadius: 12,
        textDecoration: "none",
        color: "white",
        transition: "all 0.3s ease",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)",
        minHeight: 70,
        border: "1px solid rgba(102, 126, 234, 0.3)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.35), 0 0 0 2px #667eea";
        e.currentTarget.style.borderColor = "#667eea";
        e.currentTarget.style.background = "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.background = "linear-gradient(135deg, #3a3456 0%, #2d2a4a 100%)";
      }}
    >
      <div style={{ 
        fontSize: "clamp(30px, 5vw, 34px)", 
        filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ 
          margin: "0 0 3px 0",
          fontSize: "clamp(15px, 3vw, 16px)",
          fontWeight: 700,
          color: "#a8b3ff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {title}
        </h3>
        <p style={{ 
          margin: 0, 
          color: "rgba(255, 255, 255, 0.75)",
          fontSize: "clamp(12px, 2.5vw, 13px)",
          lineHeight: 1.3,
          fontWeight: 400,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {description}
        </p>
      </div>
    </Link>
  );
}


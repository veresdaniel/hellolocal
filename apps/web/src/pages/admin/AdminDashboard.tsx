// src/pages/admin/AdminDashboard.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { APP_LANGS, DEFAULT_LANG, HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang } from "../../app/config";
import { buildUrl } from "../../app/urls";
import { useRouteCtx } from "../../app/useRouteCtx";
import { getSiteMemberships } from "../../api/admin.api";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const navigate = useNavigate();
  const { lang, siteKey } = useRouteCtx();
  usePageTitle("admin.dashboard");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  
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
  
  // Check site-level role (siteadmin)
  useEffect(() => {
    const checkSiteAdminRole = async () => {
      if (!selectedSiteId || !user) {
        setIsSiteAdmin(false);
        return;
      }
      try {
        const memberships = await getSiteMemberships(selectedSiteId, user.id);
        const membership = memberships.find(m => m.siteId === selectedSiteId && m.userId === user.id);
        setIsSiteAdmin(membership?.role === "siteadmin" || false);
      } catch (err) {
        console.error("Failed to check site admin role", err);
        setIsSiteAdmin(false);
      }
    };
    checkSiteAdminRole();
  }, [selectedSiteId, user?.id]);
  
  // Get language from URL or use default
  const currentLang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${currentLang}/admin${subPath}`;
  
  // Determine permissions: consider both global role and tenant-level role
  const isSuperadmin = user?.role === "superadmin";
  const isGlobalAdmin = user?.role === "admin";
  const isGlobalEditor = user?.role === "editor";
  const isGlobalViewer = user?.role === "viewer";
  
  // Effective admin permissions: superadmin OR global admin OR siteadmin
  const hasAdminPermissions = isSuperadmin || isGlobalAdmin || isSiteAdmin;

  // Determine if EventLog card should be shown (admin or siteadmin)
  const showEventLog = hasAdminPermissions;

  // Public site URL
  const publicSiteUrl = buildUrl({ lang: currentLang, siteKey, path: "" });

  // Quick actions handlers
  const handleNewPlace = () => {
    navigate(adminPath("/places"));
  };

  const handleNewEvent = () => {
    navigate(adminPath("/events"));
  };

  return (
    <div>
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1 style={{ 
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white",
          margin: 0,
          marginBottom: 8,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.dashboard")}
        </h1>
        <p style={{ 
          fontSize: "clamp(13px, 3vw, 14px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 400,
          color: "#c0c0d0",
          margin: 0,
          textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
        }}>
          {t("admin.dashboardWelcome")}
        </p>
      </div>

      {/* Quick Actions - Only show for editor, admin, superadmin (not viewer) */}
      {!isMobile && user && user.role !== "viewer" && (
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "clamp(24px, 5vw, 32px)",
          flexWrap: "wrap",
        }}>
          <QuickActionButton
            icon="➕"
            label={t("admin.forms.newPlace")}
            onClick={handleNewPlace}
          />
          <QuickActionButton
            icon="➕"
            label={t("admin.forms.newEvent")}
            onClick={handleNewEvent}
            highlight
          />
          <QuickActionButton
            icon="🔗"
            label={t("admin.viewPublicSite")}
            onClick={() => window.open(publicSiteUrl, "_blank")}
            isExternal
          />
        </div>
      )}

      {/* Content Creation Block */}
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <SectionTitle label={t("admin.dashboardSections.contentCreation")} />
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
            title={t("admin.dashboardCards.places")}
            description={t("admin.dashboardCards.placesDesc")}
            link={adminPath("/places")}
            icon="📍"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.events")}
            description={t("admin.dashboardCards.eventsDesc")}
            link={adminPath("/events")}
            icon="📅"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.towns")}
            description={t("admin.dashboardCards.townsDesc")}
            link={adminPath("/towns")}
            icon="🏘️"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.categories")}
            description={t("admin.dashboardCards.categoriesDesc")}
            link={adminPath("/categories")}
            icon="📁"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.priceBands")}
            description={t("admin.dashboardCards.priceBandsDesc")}
            link={adminPath("/price-bands")}
            icon="💰"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.tags")}
            description={t("admin.dashboardCards.tagsDesc")}
            link={adminPath("/tags")}
            icon="🏷️"
            isMobile={isMobile}
            variant="content"
          />
        </div>
      </div>

      {/* Public Appearance Block */}
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <SectionTitle label={t("admin.dashboardSections.publicAppearance")} />
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
            title={t("admin.dashboardCards.staticPages")}
            description={t("admin.dashboardCards.staticPagesDesc")}
            link={adminPath("/static-pages")}
            icon="📝"
            isMobile={isMobile}
            variant="content"
          />
          <DashboardCard
            title={t("admin.dashboardCards.legalPages")}
            description={t("admin.dashboardCards.legalPagesDesc")}
            link={adminPath("/legal")}
            icon="📄"
            isMobile={isMobile}
            variant="content"
          />
          {user?.role === "superadmin" && (
            <DashboardCard
              title={t("admin.dashboardCards.siteInstances")}
              description={t("admin.dashboardCards.siteInstancesDesc")}
              link={adminPath("/site-instances")}
              icon="🌐"
              isMobile={isMobile}
              variant="content"
            />
          )}
        </div>
      </div>

      {/* Permissions & People Block */}
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <SectionTitle label={t("admin.dashboardSections.permissions")} />
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
          {user?.role === "superadmin" && (
            <DashboardCard
              title={t("admin.users")}
              description={t("admin.dashboardCards.usersDesc")}
              link={adminPath("/users")}
              icon="👥"
              isMobile={isMobile}
              variant="admin"
            />
          )}
          {user?.role === "superadmin" && (
            <DashboardCard
              title={t("admin.dashboardCards.siteMemberships")}
              description={t("admin.dashboardCards.siteMembershipsDesc")}
              link={adminPath("/site-memberships")}
              icon="👥"
              isMobile={isMobile}
              variant="admin"
            />
          )}
          {hasAdminPermissions && (
            <DashboardCard
              title={t("admin.dashboardCards.placeMemberships")}
              description={t("admin.dashboardCards.placeMembershipsDesc")}
              link={adminPath("/place-memberships")}
              icon="📍"
              isMobile={isMobile}
              variant="admin"
            />
          )}
        </div>
      </div>

      {/* System / Admin Block */}
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <SectionTitle label={t("admin.dashboardSections.system")} />
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
          {user?.role === "superadmin" && (
            <DashboardCard
              title={t("admin.appSettings")}
              description={t("admin.dashboardCards.appSettingsDesc")}
              link={adminPath("/platform-settings")}
              icon="⚙️"
              isMobile={isMobile}
              variant="admin"
            />
          )}
          {user?.role === "superadmin" && (
            <DashboardCard
              title={t("admin.dashboardCards.brands")}
              description={t("admin.dashboardCards.brandsDesc")}
              link={adminPath("/brands")}
              icon="🏷️"
              isMobile={isMobile}
              variant="admin"
            />
          )}
          {user?.role === "superadmin" && HAS_MULTIPLE_SITES && (
            <DashboardCard
              title={t("admin.sites")}
              description={t("admin.dashboardCards.sitesDesc")}
              link={adminPath("/sites")}
              icon="🗺️"
              isMobile={isMobile}
              variant="admin"
            />
          )}
          {showEventLog && (
            <DashboardCard
              title={t("admin.dashboardCards.eventLog")}
              description={t("admin.dashboardCards.eventLogDesc")}
              link={adminPath("/event-log")}
              icon="📋"
              isMobile={isMobile}
              variant="admin"
            />
          )}
        </div>
      </div>

    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h2 style={{
      fontSize: "clamp(14px, 3vw, 16px)",
      fontWeight: 600,
      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#a8b3ff",
      margin: "0 0 12px 0",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }}>
      {label}
    </h2>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
  isExternal = false,
  highlight = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isExternal?: boolean;
  highlight?: boolean;
}) {
  // Highlighted button (for "Új esemény") - lighter background with sparkle badge
  const normalBg = "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)";
  const normalBgHover = "linear-gradient(135deg, #5a5574 0%, #4d4a68 100%)";
  const highlightBg = "linear-gradient(135deg, #5a5574 0%, #4d4a68 100%)";
  const highlightBgHover = "linear-gradient(135deg, #6a6584 0%, #5d5a78 100%)";
  
  const background = highlight ? highlightBg : normalBg;
  const backgroundHover = highlight ? highlightBgHover : normalBgHover;
  
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        background,
        border: highlight 
          ? "1px solid rgba(102, 126, 234, 0.6)" 
          : "1px solid rgba(102, 126, 234, 0.4)",
        borderRadius: 8,
        color: "white",
        fontSize: "clamp(13px, 2.5vw, 14px)",
        fontWeight: 600,
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: highlight 
          ? "0 2px 8px rgba(102, 126, 234, 0.3)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = highlight 
          ? "0 4px 12px rgba(102, 126, 234, 0.4)" 
          : "0 4px 12px rgba(0, 0, 0, 0.3)";
        e.currentTarget.style.background = backgroundHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = highlight 
          ? "0 2px 8px rgba(102, 126, 234, 0.3)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)";
        e.currentTarget.style.background = background;
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
      {highlight && (
        <span style={{ 
          fontSize: "14px", 
          marginLeft: "2px",
          filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))",
        }}>
          ✨
        </span>
      )}
      {isExternal && <span style={{ fontSize: "12px", opacity: 0.7 }}>↗</span>}
    </button>
  );
}

function DashboardCard({
  title,
  description,
  link,
  icon,
  isMobile = false,
  variant = "content",
}: {
  title: string;
  description: string;
  link: string;
  icon: string;
  isMobile?: boolean;
  variant?: "content" | "admin";
}) {
  // Color variants: content = lighter, admin = darker/neutral
  const contentBg = "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)";
  const contentBgHover = "linear-gradient(135deg, #5a5574 0%, #4d4a68 100%)";
  const adminBg = "linear-gradient(135deg, #3a3456 0%, #2d2a4a 100%)";
  const adminBgHover = "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)";
  
  const background = variant === "content" ? contentBg : adminBg;
  const backgroundHover = variant === "content" ? contentBgHover : adminBgHover;

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
          background,
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
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
        background,
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
        e.currentTarget.style.background = backgroundHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.background = background;
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
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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


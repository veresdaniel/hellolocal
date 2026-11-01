// src/pages/admin/AdminDashboard.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Link, useParams } from "react-router-dom";
import { useContext, useState, useEffect, useMemo } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
import {
  DEFAULT_LANG,
  type Lang,
  isLang,
} from "../../app/config";
import { getSiteMemberships } from "../../api/admin.api";
import { isSuperadmin, hasUserRolePermission } from "../../utils/roleHelpers";
import { ROLE_ADMIN, ROLE_EDITOR } from "../../types/enums";
import type { UserRole } from "../../types/enums";

type DashboardCardItem = {
  key: string;
  title: string;
  description: string;
  link: string;
  icon: string;
  variant: "content" | "admin";
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  const { lang: langParam } = useParams<{ lang?: string }>();
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
        const membership = memberships.find(
          (m) => m.siteId === selectedSiteId && m.userId === user.id
        );
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

  // Align card visibility with ProtectedRoute ROLE_* guards (presentation only)
  const userRole = (user?.role ?? null) as UserRole | null;
  const userIsSuperadmin = userRole ? isSuperadmin(userRole) : false;
  // Content routes: requiredRole=editor (no considerSiteRole) → editor / admin / superadmin
  const canEditContent = userRole ? hasUserRolePermission(userRole, ROLE_EDITOR) : false;
  // Site admin routes: requiredRole=admin + considerSiteRole → global admin / siteadmin / superadmin
  const canManageSite =
    userIsSuperadmin ||
    (userRole ? hasUserRolePermission(userRole, ROLE_ADMIN) : false) ||
    isSiteAdmin;
  // Tartalom order: Új hely → Új esemény → Régió/tagságok → Települések → Hely tagságok → Kategóriák → Eseménynapló → Régióállapot.
  // Galériák/Termékek/Címkék live under hely in Települések — not top-level cards.
  // Régió card: superadmin label includes region settings; siteadmin/régióadmin sees memberships-only label.
  const contentCards = useMemo((): DashboardCardItem[] => {
    const cards: DashboardCardItem[] = [];
    if (canEditContent) {
      cards.push(
        {
          key: "newPlace",
          title: t("admin.dashboardCards.newPlace"),
          description: t("admin.dashboardCards.newPlaceDesc"),
          link: `${adminPath("/places")}?new=true&from=dashboard`,
          icon: "📍",
          variant: "content",
        },
        {
          key: "newEvent",
          title: t("admin.dashboardCards.newEvent"),
          description: t("admin.dashboardCards.newEventDesc"),
          link: `${adminPath("/events")}?new=true&from=dashboard`,
          icon: "✨",
          variant: "content",
        }
      );
    }
    // Matches site-memberships: ROLE_ADMIN + considerSiteRole
    if (canManageSite) {
      cards.push({
        key: "regionAndMemberships",
        title: userIsSuperadmin
          ? t("admin.dashboardCards.regionAndMemberships")
          : t("admin.dashboardCards.regionMembershipsOnly"),
        description: t("admin.dashboardCards.regionAndMembershipsDesc"),
        link: adminPath("/site-memberships"),
        icon: "🗺️",
        variant: "content",
      });
    }
    if (canEditContent) {
      cards.push({
        key: "contentHierarchy",
        title: t("admin.dashboardCards.contentHierarchy"),
        description: t("admin.dashboardCards.contentHierarchyDesc"),
        link: adminPath("/towns"),
        icon: "🏘️",
        variant: "content",
      });
    }
    // Matches place-memberships: ROLE_ADMIN + considerSiteRole
    if (canManageSite) {
      cards.push({
        key: "placeMemberships",
        title: t("admin.dashboardCards.placeMemberships"),
        description: t("admin.dashboardCards.placeMembershipsDesc"),
        link: adminPath("/place-memberships"),
        icon: "🔐",
        variant: "content",
      });
    }
    if (canEditContent) {
      cards.push({
        key: "categories",
        title: t("admin.dashboardCards.categories"),
        description: t("admin.dashboardCards.categoriesDesc"),
        link: adminPath("/categories"),
        icon: "📁",
        variant: "content",
      });
    }
    // Matches event-log: ROLE_ADMIN + considerSiteRole
    if (canManageSite) {
      cards.push({
        key: "eventLog",
        title: t("admin.dashboardCards.eventLog"),
        description: t("admin.dashboardCards.eventLogDesc"),
        link: adminPath("/event-log"),
        icon: "📋",
        variant: "content",
      });
    }
    // Régióállapot: content-scoped; superadmin sees all regions, others only assigned
    if (canManageSite) {
      cards.push({
        key: "siteStatus",
        title: t("admin.siteStatus.title"),
        description: t("admin.dashboardCards.siteStatusDesc"),
        link: adminPath("/site-status"),
        icon: "📡",
        variant: "content",
      });
    }
    return cards;
  }, [canEditContent, canManageSite, userIsSuperadmin, currentLang, t]);

  // Platform / superadmin only — matches ROLE_SUPERADMIN route gates
  // Régió + régió tagságok live under Tartalom (combined card).
  const platformCards = useMemo((): DashboardCardItem[] => {
    if (!userIsSuperadmin) return [];
    return [
      {
        key: "users",
        title: t("admin.users"),
        description: t("admin.dashboardCards.usersDesc"),
        link: adminPath("/users"),
        icon: "👥",
        variant: "admin",
      },
      {
        key: "i18n",
        title: t("admin.i18n.title"),
        description: t("admin.dashboardCards.i18nDesc"),
        link: adminPath("/i18n"),
        icon: "🌐",
        variant: "admin",
      },
      {
        key: "appSettings",
        title: t("admin.appSettings"),
        description: t("admin.dashboardCards.appSettingsDesc"),
        link: adminPath("/platform-settings"),
        icon: "⚙️",
        variant: "admin",
      },
      {
        key: "priceBands",
        title: t("admin.dashboardCards.priceBands"),
        description: t("admin.dashboardCards.priceBandsDesc"),
        link: adminPath("/price-bands"),
        icon: "💰",
        variant: "admin",
      },
      {
        key: "staticPages",
        title: t("admin.dashboardCards.staticPages"),
        description: t("admin.dashboardCards.staticPagesDesc"),
        link: adminPath("/static-pages"),
        icon: "📝",
        variant: "admin",
      },
      {
        key: "legalPages",
        title: t("admin.dashboardCards.legalPages"),
        description: t("admin.dashboardCards.legalPagesDesc"),
        link: adminPath("/legal"),
        icon: "📄",
        variant: "admin",
      },
      {
        key: "domains",
        title: t("admin.dashboardCards.domains"),
        description: t("admin.dashboardCards.domainsDesc"),
        link: adminPath("/domains"),
        icon: "🏷️",
        variant: "admin",
      },
      {
        key: "collections",
        title: t("admin.dashboardCards.collections"),
        description: t("admin.dashboardCards.collectionsDesc"),
        link: adminPath("/collections"),
        icon: "📚",
        variant: "admin",
      },
      // Site instances live under Régió edit (Instances tab) — not a platform card
      {
        key: "subscriptions",
        title: t("admin.subscriptionsDashboard"),
        description: t("admin.dashboardCards.subscriptionsDesc"),
        link: adminPath("/subscriptions"),
        icon: "💳",
        variant: "admin",
      },
      {
        key: "globalAnalytics",
        title: t("admin.dashboardCards.globalAnalytics"),
        description: t("admin.dashboardCards.globalAnalyticsDesc"),
        link: adminPath("/analytics"),
        icon: "📊",
        variant: "admin",
      },
    ];
  }, [userIsSuperadmin, currentLang, t]);

  const gridStyle = {
    display: "grid" as const,
    gridTemplateColumns: isMobile
      ? "repeat(auto-fit, minmax(min(100%, 96px), 1fr))"
      : isTablet
        ? "repeat(auto-fit, minmax(min(100%, 180px), 1fr))"
        : "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
    gap: isMobile ? "12px" : "clamp(16px, 3vw, 24px)",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div>
      <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
        <h1
          className="admin-page-title"
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "var(--hl-on-dark-strong, #ffffff)",
            margin: 0,
            marginBottom: 8,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          {t("admin.dashboard")}
        </h1>
        <p
          className="admin-page-muted"
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 400,
            color: "var(--hl-muted-on-dark, #a8b0c8)",
            margin: 0,
            textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          {t("admin.dashboardWelcome")}
        </p>
      </div>

      {contentCards.length > 0 && (
        <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
          <SectionTitle label={t("admin.dashboardSections.content")} />
          <div style={gridStyle}>
            {contentCards.map((card) => (
              <DashboardCard
                key={card.key}
                title={card.title}
                description={card.description}
                link={card.link}
                icon={card.icon}
                isMobile={isMobile}
                variant={card.variant}
              />
            ))}
          </div>
        </div>
      )}

      {platformCards.length > 0 && (
        <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
          <SectionTitle label={t("admin.dashboardSections.platform")} />
          <div style={gridStyle}>
            {platformCards.map((card) => (
              <DashboardCard
                key={card.key}
                title={card.title}
                description={card.description}
                link={card.link}
                icon={card.icon}
                isMobile={isMobile}
                variant={card.variant}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h2
      className="admin-page-section-title"
      style={{
        fontSize: "clamp(14px, 3vw, 16px)",
        fontWeight: 600,
        fontFamily:
          "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "var(--hl-on-dark-strong, #ffffff)",
        margin: "0 0 12px 0",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </h2>
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
          color: "var(--hl-on-dark, #f2f4fb)",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)",
          border: "1px solid rgba(102, 126, 234, 0.3)",
          position: "relative",
          padding: 8,
          boxSizing: "border-box",
        }}
        className="admin-dash-card"
        onTouchStart={(e) => {
          e.currentTarget.style.transform = "scale(0.95)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)";
        }}
      >
        <div
          style={{
            fontSize: "32px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div
          className="admin-dash-card__title"
          style={{
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
            color: "var(--hl-on-dark-strong, #ffffff)",
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
          }}
        >
          {title}
        </div>
      </Link>
    );
  }

  // Desktop: Original card style with title and description
  return (
    <Link
      to={link}
      className="admin-dash-card"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "clamp(10px, 2vw, 12px)",
        padding: "clamp(10px, 2vw, 12px)",
        background,
        borderRadius: 12,
        textDecoration: "none",
        color: "var(--hl-on-dark, #f2f4fb)",
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
        e.currentTarget.style.boxShadow =
          "0 6px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
        e.currentTarget.style.background = background;
      }}
    >
      <div
        style={{
          fontSize: "clamp(30px, 5vw, 34px)",
          filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          className="admin-dash-card__title"
          style={{
            margin: "0 0 3px 0",
            fontSize: "clamp(15px, 3.5vw, 16px)",
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 700,
            color: "var(--hl-on-dark-strong, #ffffff)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h3>
        <p
          className="admin-dash-card__desc"
          style={{
            margin: 0,
            color: "var(--hl-muted-on-dark, #a8b0c8)",
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            lineHeight: 1.3,
            fontWeight: 400,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

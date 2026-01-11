// src/pages/admin/AdminDashboard.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Link, useParams } from "react-router-dom";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../../app/config";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  usePageTitle("admin.dashboard");
  
  // Get language from URL or use default
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  
  // Helper to build admin paths with language
  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <h1>{t("admin.dashboard")}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
        <DashboardCard
          title={t("admin.dashboardCards.events")}
          description={t("admin.dashboardCards.eventsDesc")}
          link={adminPath("/events")}
          icon="📅"
        />
        <DashboardCard
          title={t("admin.dashboardCards.places")}
          description={t("admin.dashboardCards.placesDesc")}
          link={adminPath("/places")}
          icon="📍"
        />
        <DashboardCard
          title={t("admin.dashboardCards.priceBands")}
          description={t("admin.dashboardCards.priceBandsDesc")}
          link={adminPath("/price-bands")}
          icon="💰"
        />
        <DashboardCard
          title={t("admin.dashboardCards.categories")}
          description={t("admin.dashboardCards.categoriesDesc")}
          link={adminPath("/categories")}
          icon="📁"
        />
        <DashboardCard
          title={t("admin.dashboardCards.tags")}
          description={t("admin.dashboardCards.tagsDesc")}
          link={adminPath("/tags")}
          icon="🏷️"
        />
        <DashboardCard
          title={t("admin.dashboardCards.towns")}
          description={t("admin.dashboardCards.townsDesc")}
          link={adminPath("/towns")}
          icon="🏘️"
        />
        <DashboardCard
          title={t("admin.dashboardCards.legalPages")}
          description={t("admin.dashboardCards.legalPagesDesc")}
          link={adminPath("/legal")}
          icon="📄"
        />
        <DashboardCard
          title={t("admin.dashboardCards.staticPages")}
          description={t("admin.dashboardCards.staticPagesDesc")}
          link={adminPath("/static-pages")}
          icon="📝"
        />
        <DashboardCard
          title={t("admin.dashboardCards.userProfile")}
          description={t("admin.dashboardCards.userProfileDesc")}
          link={adminPath("/profile")}
          icon="👤"
        />
      </div>

    </div>
  );
}

function DashboardCard({
  title,
  description,
  link,
  icon,
}: {
  title: string;
  description: string;
  link: string;
  icon: string;
}) {
  return (
    <Link
      to={link}
      style={{
        display: "block",
        padding: 24,
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>
      <p style={{ margin: 0, color: "#666" }}>{description}</p>
    </Link>
  );
}


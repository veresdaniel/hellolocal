// src/pages/admin/AdminDashboard.tsx
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Link } from "react-router-dom";

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  usePageTitle("admin.dashboard");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <h1>{t("admin.dashboard")}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
        <DashboardCard
          title={t("admin.dashboardCards.userProfile")}
          description={t("admin.dashboardCards.userProfileDesc")}
          link="/admin/profile"
          icon="👤"
        />
        <DashboardCard
          title={t("admin.dashboardCards.categories")}
          description={t("admin.dashboardCards.categoriesDesc")}
          link="/admin/categories"
          icon="📁"
        />
        <DashboardCard
          title={t("admin.dashboardCards.tags")}
          description={t("admin.dashboardCards.tagsDesc")}
          link="/admin/tags"
          icon="🏷️"
        />
        <DashboardCard
          title={t("admin.dashboardCards.priceBands")}
          description={t("admin.dashboardCards.priceBandsDesc")}
          link="/admin/price-bands"
          icon="💰"
        />
        <DashboardCard
          title={t("admin.dashboardCards.places")}
          description={t("admin.dashboardCards.placesDesc")}
          link="/admin/places"
          icon="📍"
        />
        <DashboardCard
          title={t("admin.dashboardCards.towns")}
          description={t("admin.dashboardCards.townsDesc")}
          link="/admin/towns"
          icon="🏘️"
        />
        <DashboardCard
          title={t("admin.dashboardCards.legalPages")}
          description={t("admin.dashboardCards.legalPagesDesc")}
          link="/admin/legal"
          icon="📄"
        />
        <DashboardCard
          title={t("admin.dashboardCards.settings")}
          description={t("admin.dashboardCards.settingsDesc")}
          link="/admin/settings"
          icon="⚙️"
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


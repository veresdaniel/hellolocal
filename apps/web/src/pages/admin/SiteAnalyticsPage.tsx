import { useTranslation } from "react-i18next";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";

export function SiteAnalyticsPage() {
  const { t } = useTranslation();
  usePageTitle("admin.analyticsLabel");

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageHeader
        title={t("admin.analyticsLabel") || "Analytics"}
        subtitle={t("admin.dashboardCards.analyticsDesc") || "View site and place analytics, page views, and CTA clicks"}
        showNewButton={false}
      />
      <AnalyticsDashboard scope="site" />
    </div>
  );
}

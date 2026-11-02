import { useTranslation } from "react-i18next";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";

export function GlobalAnalyticsPage() {
  const { t } = useTranslation();
  usePageTitle("admin.dashboardCards.globalAnalytics");

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.dashboardCards.globalAnalytics") || "Globális analytics"}
        subtitle={
          t("admin.dashboardCards.globalAnalyticsDesc") ||
          "Összesített mutatók minden régiótól és helytől függetlenül"
        }
        showNewButton={false}
      />
      <AnalyticsDashboard scope="global" />
    </div>
  );
}

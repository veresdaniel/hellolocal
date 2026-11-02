import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";

export function SiteAnalyticsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const siteKey = searchParams.get("siteKey") || undefined;
  usePageTitle("admin.analyticsLabel");

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.hierarchy.regionAnalytics") || "Régió analitika"}
        subtitle={
          t("admin.hierarchy.regionAnalyticsHint") ||
          "A kiválasztott régió / site összesített mutatói"
        }
        showNewButton={false}
      />
      <AnalyticsDashboard scope="site" siteKey={siteKey} />
    </div>
  );
}

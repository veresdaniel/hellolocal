import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getTown } from "../../api/admin.api";
import type { Lang } from "../../types/enums";

export function TownAnalyticsPage() {
  const { townId, lang } = useParams<{ townId: string; lang?: string }>();
  const { t, i18n } = useTranslation();
  const [townName, setTownName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  usePageTitle("admin.analyticsLabel");

  useEffect(() => {
    if (!townId) return;
    getTown(townId)
      .then((town) => {
        const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
        const translation =
          town.translations.find((row) => row.lang === currentLang) || town.translations[0];
        setTownName(translation?.name || townId);
      })
      .catch(() => {
        setTownName(townId);
      })
      .finally(() => setIsLoading(false));
  }, [townId, i18n.language]);

  if (!townId) {
    return <div>{t("admin.hierarchy.townRequired")}</div>;
  }

  if (isLoading) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageHeader
        title={`${townName} — ${t("admin.analyticsLabel") || "Analytics"}`}
        subtitle={
          t("admin.hierarchy.townAnalyticsDesc") ||
          "Település analitika: hely megtekintések és CTA-k"
        }
        showNewButton={false}
        backTo={`/${lang || i18n.language || "hu"}/admin/towns`}
      />
      <AnalyticsDashboard scope="town" townId={townId} />
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useEffect, useState } from "react";
import { getPlace } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";

export function PlaceAnalyticsPage() {
  const { placeId, lang } = useParams<{ placeId: string; lang?: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [placeName, setPlaceName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  usePageTitle("admin.analyticsLabel");

  useEffect(() => {
    if (placeId) {
      getPlace(placeId)
        .then((place) => {
          const currentLang = (i18n.language || "hu").split("-")[0] as "hu" | "en" | "de";
          const translation = place.translations.find((t) => t.lang === currentLang) || place.translations[0];
          setPlaceName(translation?.name || placeId);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [placeId, i18n.language]);

  if (!placeId) {
    return <div>Place ID is required</div>;
  }

  if (isLoading) {
    return <LoadingSpinner isLoading={true} />;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageHeader
        title={`${placeName} ${t("admin.analyticsLabel") || "analitikája"}`}
        subtitle={t("admin.dashboardCards.analyticsDesc") || "View place analytics, views, and CTA clicks"}
        showNewButton={false}
        backTo={`/${lang || i18n.language || "hu"}/admin/places`}
      />
      <AnalyticsDashboard scope="place" placeId={placeId} />
    </div>
  );
}

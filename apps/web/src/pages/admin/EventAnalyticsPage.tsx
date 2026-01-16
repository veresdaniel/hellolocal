import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useEffect, useState } from "react";
import { getEvent } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { findTranslation } from "../../utils/langHelpers";
import type { Lang } from "../../types/enums";

export function EventAnalyticsPage() {
  const { eventId, lang } = useParams<{ eventId: string; lang?: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [eventName, setEventName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  usePageTitle("admin.analyticsLabel");

  useEffect(() => {
    if (eventId) {
      getEvent(eventId)
        .then((event) => {
          const currentLang = (i18n.language || "hu").split("-")[0] as Lang;
          const translation =
            findTranslation(event.translations, currentLang) || event.translations[0];
          setEventName(translation?.title || eventId);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [eventId, i18n.language]);

  if (!eventId) {
    return <div>Event ID is required</div>;
  }

  if (isLoading) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <AdminPageHeader
        title={`${eventName} ${t("admin.analyticsLabel") || "analitikája"}`}
        subtitle={
          t("admin.dashboardCards.analyticsDesc") || "View event analytics, views, and CTA clicks"
        }
        showNewButton={false}
        backTo={`/${lang || i18n.language || "hu"}/admin/events`}
      />
      <AnalyticsDashboard scope="event" eventId={eventId} />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { GA_MEASUREMENT_ID_PATTERN } from "../lib/gaMeasurementId";

const ANALYTICS_HOME = "https://analytics.google.com/analytics/web/";

/** Shown beside a saved GA4 measurement ID. Opens the Analytics console. */
export function GaConsoleLink({ measurementId }: { measurementId: string }) {
  const { t } = useTranslation();
  const id = measurementId.trim().toUpperCase();
  if (!GA_MEASUREMENT_ID_PATTERN.test(id)) return null;
  return (
    <a
      href={ANALYTICS_HOME}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        alignSelf: "center",
        whiteSpace: "nowrap",
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {t("admin.googleAnalytics.openConsole")}
    </a>
  );
}

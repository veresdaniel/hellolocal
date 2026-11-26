import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";
import { useIsMobileAdmin } from "./useIsMobileAdmin";
import { wizardCard, wizardPage } from "./wizardStyles";

export function WizardHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const isMobile = useIsMobileAdmin();
  usePageTitle("admin.wizard.homeTitle");

  const currentLang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const base = `/${currentLang}/admin/wizard`;

  if (!isMobile) {
    return <Navigate to={`/${currentLang}/admin/content/new`} replace />;
  }

  return (
    <div style={wizardPage}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>{t("admin.wizard.homeTitle")}</h1>
      <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.45, opacity: 0.85 }}>
        {t("admin.wizard.homeLead")}
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate(`${base}/place`)}
          style={{ ...wizardCard, textAlign: "left", cursor: "pointer", width: "100%" }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {t("admin.wizard.placeCard")}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.85 }}>
            {t("admin.wizard.placeCardDesc")}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate(`${base}/event`)}
          style={{ ...wizardCard, textAlign: "left", cursor: "pointer", width: "100%" }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {t("admin.wizard.eventCard")}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.85 }}>
            {t("admin.wizard.eventCardDesc")}
          </div>
        </button>
      </div>
    </div>
  );
}

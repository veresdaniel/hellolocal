import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAdminBackPath } from "../utils/adminBackPath";

export function AdminBackButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams<{ lang?: string }>();

  const backPath = getAdminBackPath(location.pathname, lang);
  if (!backPath) return null;

  return (
    <button
      type="button"
      className="admin-btn admin-btn--ghost"
      onClick={() => navigate(backPath)}
      style={{
        padding: "8px 16px",
        background: "rgba(255, 255, 255, 0.2)",
        color: "#ffffff",
        border: "1px solid rgba(255, 255, 255, 0.35)",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        fontWeight: 600,
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
      }}
      aria-label={t("common.goBack", { defaultValue: "Vissza" })}
    >
      <span aria-hidden="true">←</span>
      <span>{t("common.goBack", { defaultValue: "Vissza" })}</span>
    </button>
  );
}

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  isAdminDashboardPath,
  resolveAdminBackNavigation,
} from "../utils/adminBackPath";
import { DEFAULT_LANG, isLang } from "../app/config";

interface AdminBackButtonProps {
  /** Override destination (also used by AdminPageHeader cancel). */
  backTo?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Unified admin "Vissza" control — readable ghost chip on purple chrome.
 * Hidden on the dashboard; login/auth pages do not use AdminLayout.
 */
export function AdminBackButton({
  backTo,
  className = "admin-btn admin-btn--ghost",
  style,
}: AdminBackButtonProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();

  const lang = isLang(langParam)
    ? langParam
    : isLang(i18n.language)
      ? i18n.language
      : DEFAULT_LANG;

  if (isAdminDashboardPath(location.pathname)) {
    return null;
  }

  const handleClick = () => {
    const returned = (location.state as { adminReturn?: string } | null)?.adminReturn;
    if (returned && returned.startsWith("/")) {
      navigate(returned);
      return;
    }
    const action = resolveAdminBackNavigation(location.pathname, lang, backTo);
    if (action.type === "none") return;
    if (action.type === "history") {
      navigate(-1);
      return;
    }
    navigate(action.to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{
        padding: "8px 16px",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        ...style,
      }}
      aria-label={t("common.goBack") || t("common.back") || "Vissza"}
    >
      <span aria-hidden="true">←</span>
      <span>{t("common.goBack") || t("common.back") || "Vissza"}</span>
    </button>
  );
}

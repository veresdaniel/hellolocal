import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { UiCopyEditor } from "../../components/UiCopyEditor";

export function UiCopyPage() {
  const { t } = useTranslation();
  usePageTitle("admin.uiCopy");

  return (
    <div className="admin-page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 className="admin-page-title" style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700 }}>
          {t("admin.uiCopy")}
        </h1>
        <p className="admin-page-muted" style={{ margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
          {t("admin.uiCopyHint")}
        </p>
      </div>
      <UiCopyEditor showLanguageManager showNamespaceFilter />
    </div>
  );
}

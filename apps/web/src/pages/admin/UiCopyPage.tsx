import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { UiCopyEditor } from "../../components/UiCopyEditor";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";

export function UiCopyPage() {
  const { t } = useTranslation();
  usePageTitle("admin.uiCopy");
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700 }}>{t("admin.uiCopy")}</h1>
          <p style={{ margin: 0, color: "#555", maxWidth: 720, lineHeight: 1.5 }}>
            {t("admin.uiCopyHint")}
          </p>
        </div>
        <Link
          to={`/${lang}/admin/i18n`}
          style={{ color: "#1b1730", fontSize: 14, fontWeight: 600, textDecoration: "underline" }}
        >
          {t("admin.i18n.backToMenu")}
        </Link>
      </div>
      <UiCopyEditor showLanguageManager showNamespaceFilter />
    </div>
  );
}

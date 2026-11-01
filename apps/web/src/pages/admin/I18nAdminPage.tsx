import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { isSuperadmin } from "../../utils/roleHelpers";
import { UiCopyEditor } from "../../components/UiCopyEditor";
import {
  defaultSectionId,
  I18N_SECTIONS,
  sectionMatchesKey,
  type I18nSectionId,
} from "./i18nAdminSections";
import { DEFAULT_LANG, type Lang, isLang } from "../../app/config";
import { useParams } from "react-router-dom";

export function I18nAdminPage() {
  const { t } = useTranslation();
  usePageTitle("admin.i18n.title");
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  const userIsSuperadmin = user ? isSuperadmin(user.role) : false;

  const available = I18N_SECTIONS;

  const requested = searchParams.get("section") as I18nSectionId | null;
  const activeId =
    (requested && available.some((section) => section.id === requested) && requested) ||
    defaultSectionId(available);

  const active = available.find((section) => section.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId) return;
    if (searchParams.get("section") === activeId) return;
    setSearchParams({ section: activeId }, { replace: true });
  }, [activeId, searchParams, setSearchParams]);

  const keyFilter = useMemo(() => {
    if (!active) return undefined;
    return (key: string) => sectionMatchesKey(active, key);
  }, [active]);

  const adminPath = (subPath: string) => `/${lang}/admin${subPath}`;

  if (!userIsSuperadmin) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700 }}>{t("admin.i18n.title")}</h1>
        <p style={{ color: "#666" }}>{t("admin.i18n.accessDenied")}</p>
      </div>
    );
  }

  const generalOptions = available.filter((section) => section.group === "general");
  const pageOptions = available.filter((section) => section.group === "pages");

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
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700 }}>{t("admin.i18n.title")}</h1>
          <p style={{ margin: 0, color: "#555", maxWidth: 720, lineHeight: 1.5 }}>
            {t("admin.i18n.hintSuperadmin")}
          </p>
        </div>
        <Link
          to={adminPath("/ui-copy")}
          style={{
            color: "#1b1730",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "underline",
            whiteSpace: "nowrap",
          }}
        >
          {t("admin.i18n.advancedKeyList")}
        </Link>
      </div>

      <label
        style={{
          display: "grid",
          gap: 8,
          marginBottom: 20,
          maxWidth: 420,
          fontWeight: 600,
        }}
      >
        {t("admin.i18n.sectionLabel")}
        <select
          value={activeId ?? ""}
          onChange={(event) => setSearchParams({ section: event.target.value })}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "10px 12px",
            font: "inherit",
            fontWeight: 500,
          }}
        >
          {generalOptions.length ? (
            <optgroup label={t("admin.i18n.groupGeneral")}>
              {generalOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {t(`admin.i18n.sections.${section.id}`)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {pageOptions.length ? (
            <optgroup label={t("admin.i18n.groupPages")}>
              {pageOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {t(`admin.i18n.sections.${section.id}`)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>

      {active ? (
        <UiCopyEditor
          key={active.id}
          keyFilter={keyFilter}
          showLanguageManager={Boolean(active.manageLanguages)}
          showNamespaceFilter={false}
        />
      ) : null}
    </div>
  );
}

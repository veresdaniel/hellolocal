import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSite } from "../api/admin.api";
import { useAdminSite } from "../contexts/useAdminSite";
import { useToast } from "../contexts/ToastContext";
import { isLang } from "../types/enums";
import { languageLabel } from "../utils/langFields";

export function SiteLanguagesEditor({
  siteId,
  languages,
  onChanged,
}: {
  siteId: string;
  languages: string[];
  onChanged: () => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { reloadSites } = useAdminSite();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const published = languages.length ? languages : ["hu", "en", "de"];

  const save = async (next: string[]) => {
    setBusy(true);
    try {
      await updateSite(siteId, { languages: next });
      await reloadSites();
      await onChanged();
      setCode("");
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(
        response || (err instanceof Error ? err.message : t("admin.errors.updateSiteFailed")),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{t("admin.siteLanguages")}</h3>
      <p
        style={{
          margin: "0 0 14px",
          color: "var(--admin-muted, #475569)",
          maxWidth: 640,
          lineHeight: 1.5,
        }}
      >
        {t("admin.siteLanguagesHint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {published.map((lang) => (
          <span
            key={lang}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "#fffdf9",
              border: "1px solid rgba(27, 23, 48, 0.12)",
            }}
          >
            {languageLabel(lang, i18n.language)} ({lang.toUpperCase()})
            <button
              type="button"
              disabled={busy || published.length <= 1}
              onClick={() => save(published.filter((item) => item !== lang))}
              style={{ border: 0, background: "transparent", cursor: "pointer", color: "#8a3b16" }}
            >
              {t("admin.removeLanguage")}
            </button>
          </span>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = code.trim().toLowerCase();
          if (!isLang(next)) {
            showToast(t("admin.languageCode"), "error");
            return;
          }
          if (published.includes(next)) return;
          void save([...published, next]);
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("admin.languageCode")}
          aria-label={t("admin.languageCode")}
          maxLength={3}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(27, 23, 48, 0.16)",
            width: 140,
          }}
        />
        <button type="submit" disabled={busy} className="admin-btn admin-btn--primary">
          {t("admin.addLanguage")}
        </button>
      </form>
    </section>
  );
}

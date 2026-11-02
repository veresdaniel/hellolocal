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
  const canRemove = published.length > 1;

  const save = async (next: string[]) => {
    if (!next.length) {
      showToast(t("admin.siteLanguagesNeedOne"), "error");
      return;
    }
    setBusy(true);
    try {
      await updateSite(siteId, { languages: next });
      await reloadSites();
      await onChanged();
      setCode("");
      showToast(t("admin.siteLanguagesUpdated"), "success");
    } catch (err) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      showToast(
        response || (err instanceof Error ? err.message : t("admin.errors.updateSiteFailed")),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-surface" style={{ marginBottom: 28 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--hl-ink, #1b1730)" }}>
        {t("admin.siteLanguages")}
      </h3>
      <p
        style={{
          margin: "0 0 14px",
          color: "var(--hl-muted, #665d78)",
          maxWidth: 640,
          lineHeight: 1.5,
        }}
      >
        {t("admin.siteLanguagesHint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        {published.map((lang) => {
          const removeDisabled = busy || !canRemove;
          return (
            <span
              key={lang}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px 8px 14px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid rgba(27, 23, 48, 0.16)",
                color: "var(--hl-ink, #1b1730)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--hl-ink, #1b1730)" }}>
                {languageLabel(lang, i18n.language)} ({lang.toUpperCase()})
              </span>
              <button
                type="button"
                disabled={removeDisabled}
                title={
                  !canRemove
                    ? t("admin.siteLanguagesNeedOne")
                    : t("admin.removeLanguage")
                }
                onClick={() => {
                  if (removeDisabled) return;
                  void save(published.filter((item) => item !== lang));
                }}
                style={{
                  border: removeDisabled
                    ? "1px solid rgba(27, 23, 48, 0.12)"
                    : "1px solid rgba(185, 28, 28, 0.35)",
                  background: removeDisabled ? "rgba(27, 23, 48, 0.06)" : "#fef2f2",
                  color: removeDisabled ? "var(--hl-muted, #665d78)" : "#b91c1c",
                  cursor: removeDisabled ? "not-allowed" : "pointer",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontWeight: 650,
                  fontSize: 13,
                  lineHeight: 1.2,
                  opacity: removeDisabled ? 0.7 : 1,
                }}
              >
                {t("admin.removeLanguage")}
              </button>
            </span>
          );
        })}
      </div>
      {!canRemove ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--hl-muted, #665d78)" }}>
          {t("admin.siteLanguagesNeedOne")}
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = code.trim().toLowerCase();
          if (!isLang(next)) {
            showToast(t("admin.languageCodeInvalid"), "error");
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
            color: "var(--hl-ink, #1b1730)",
            background: "#ffffff",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "10px 16px",
            border: 0,
            borderRadius: 8,
            background: "#1b1730",
            color: "#ffffff",
            cursor: busy ? "wait" : "pointer",
            fontWeight: 650,
          }}
        >
          {t("admin.addLanguage")}
        </button>
      </form>
    </section>
  );
}

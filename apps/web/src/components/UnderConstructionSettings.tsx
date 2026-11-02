// Platform settings: under-development gate toggle + editable page copy.
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  getUnderConstructionSettings,
  saveUnderConstructionSettings,
  type UnderConstructionAdminStatus,
  type UnderConstructionCopyByLang,
  type UnderConstructionCopyFields,
} from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { LoadingSpinner } from "./LoadingSpinner";

const LANGS = ["hu", "en", "de"] as const;

const emptyCopy = (): UnderConstructionCopyByLang => ({
  hu: { title: "", body: "", buttonLabel: "" },
  en: { title: "", body: "", buttonLabel: "" },
  de: { title: "", body: "", buttonLabel: "" },
});

type Props = {
  adminLang: string;
};

export function UnderConstructionSettings({ adminLang: _adminLang }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<UnderConstructionAdminStatus | null>(null);
  const [copy, setCopy] = useState<UnderConstructionCopyByLang>(emptyCopy);
  const [copyLang, setCopyLang] = useState<(typeof LANGS)[number]>("hu");

  const applyStatus = (next: UnderConstructionAdminStatus) => {
    setStatus(next);
    setEnabled(next.enabled);
    setCopy(next.copy);
  };

  useEffect(() => {
    let cancelled = false;
    getUnderConstructionSettings()
      .then((row) => {
        if (!cancelled) applyStatus(row);
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(
            err instanceof Error ? err.message : t("admin.underConstruction.loadFailed"),
            "error"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  const setField = (field: keyof UnderConstructionCopyFields, value: string) => {
    setCopy((prev) => ({
      ...prev,
      [copyLang]: { ...prev[copyLang], [field]: value },
    }));
  };

  const persistSettings = async (nextEnabled: boolean, nextCopy = copy) => {
    const next = await saveUnderConstructionSettings({ enabled: nextEnabled, copy: nextCopy });
    applyStatus(next);
    return next;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await persistSettings(enabled, copy);
      showToast(t("admin.underConstruction.saved"), "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.underConstruction.saveFailed"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEnabledChange = async (nextEnabled: boolean) => {
    const previous = enabled;
    setEnabled(nextEnabled);
    try {
      setSaving(true);
      await persistSettings(nextEnabled, copy);
      showToast(t("admin.underConstruction.saved"), "success");
    } catch (err) {
      setEnabled(previous);
      showToast(
        err instanceof Error ? err.message : t("admin.underConstruction.saveFailed"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner />
      </div>
    );
  }

  const fields = copy[copyLang] || emptyCopy()[copyLang];

  const inputStyle: CSSProperties = {
    width: "100%",
    maxWidth: 640,
    minHeight: 42,
    padding: "0 12px",
    border: "1px solid #d9d3e4",
    borderRadius: 8,
    font: "inherit",
  };

  return (
    <div
      id="under-construction"
      style={{
        marginBottom: 24,
        background: "white",
        borderRadius: 12,
        border: "1px solid #e0e0e0",
        padding: 24,
        scrollMarginTop: 96,
      }}
    >
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 20,
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        {t("admin.underConstruction.title")}
      </h2>
      <p style={{ margin: "0 0 16px", color: "#475569", lineHeight: 1.5 }}>
        {t("admin.underConstruction.help")}
      </p>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          fontWeight: 600,
          color: "#0f172a",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => void handleEnabledChange(event.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        {t("admin.underConstruction.enabled")}
      </label>
      <p
        style={{
          margin: "-8px 0 20px",
          color: status?.enabled ? "#166534" : "#6b7280",
          fontWeight: 600,
        }}
      >
        {status?.enabled
          ? t("admin.underConstruction.statusOn")
          : t("admin.underConstruction.statusOff")}
      </p>

      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
        {t("admin.underConstruction.copyTitle")}
      </h3>
      <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 14 }}>
        {t("admin.underConstruction.copyHelp")}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setCopyLang(code)}
            style={{
              minHeight: 36,
              padding: "0 12px",
              borderRadius: 999,
              border: copyLang === code ? "0" : "1px solid #d1d5db",
              background: copyLang === code ? "var(--admin-primary)" : "#fff",
              color: copyLang === code ? "var(--admin-on-primary, #fff)" : "#374151",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {code}
          </button>
        ))}
      </div>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#0f172a" }}>
        {t("admin.underConstruction.pageTitle")}
      </label>
      <input
        type="text"
        value={fields.title}
        onChange={(event) => setField("title", event.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#0f172a" }}>
        {t("admin.underConstruction.pageBody")}
      </label>
      <textarea
        value={fields.body}
        onChange={(event) => setField("body", event.target.value)}
        rows={4}
        style={{
          ...inputStyle,
          minHeight: 96,
          padding: 12,
          resize: "vertical",
          marginBottom: 12,
        }}
      />
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#0f172a" }}>
        {t("admin.underConstruction.buttonLabel")}
      </label>
      <input
        type="text"
        value={fields.buttonLabel}
        onChange={(event) => setField("buttonLabel", event.target.value)}
        placeholder={t("admin.underConstruction.buttonLabelOptional")}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <div style={{ marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            minHeight: 42,
            padding: "0 16px",
            border: 0,
            borderRadius: 999,
            background: "var(--admin-primary)",
            color: "var(--admin-on-primary)",
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? t("common.loading") : t("admin.underConstruction.save")}
        </button>
      </div>
    </div>
  );
}

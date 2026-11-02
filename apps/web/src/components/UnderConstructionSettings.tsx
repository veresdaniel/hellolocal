// Platform settings: under-development gate toggle, editable page copy, access link.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  getUnderConstructionSettings,
  invalidateUnderConstructionToken,
  regenerateUnderConstructionToken,
  saveUnderConstructionSettings,
  type UnderConstructionAdminStatus,
  type UnderConstructionCopyByLang,
  type UnderConstructionCopyFields,
} from "../api/admin.api";
import { buildAccessPreviewUrl } from "../lib/underConstructionAccess";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../hooks/useConfirm";
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

export function UnderConstructionSettings({ adminLang }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyToken, setBusyToken] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<UnderConstructionAdminStatus | null>(null);
  const [copy, setCopy] = useState<UnderConstructionCopyByLang>(emptyCopy);
  const [copyLang, setCopyLang] = useState<(typeof LANGS)[number]>("hu");
  const [copied, setCopied] = useState(false);

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

  const previewUrl = useMemo(() => {
    const token = status?.accessToken;
    if (!token || typeof window === "undefined") return "";
    return buildAccessPreviewUrl(window.location.origin, adminLang || "hu", token);
  }, [adminLang, status?.accessToken]);

  const setField = (field: keyof UnderConstructionCopyFields, value: string) => {
    setCopy((prev) => ({
      ...prev,
      [copyLang]: { ...prev[copyLang], [field]: value },
    }));
  };

  const persistSettings = async (nextEnabled: boolean, nextCopy = copy) => {
    let next = await saveUnderConstructionSettings({ enabled: nextEnabled, copy: nextCopy });
    // Safety net: enabling must always yield a concrete token for Copy link.
    if (nextEnabled && !next.hasToken) {
      next = await regenerateUnderConstructionToken();
    }
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

  const handleEnabledChange = async (checked: boolean) => {
    const previous = enabled;
    setEnabled(checked);
    // Persist ON and OFF immediately so the toggle is never a dirty-only UX.
    // Enabling also mints a token so Copy link works without a second click.
    try {
      setSaving(true);
      await persistSettings(checked, copy);
      showToast(
        checked
          ? t("admin.underConstruction.tokenReady")
          : t("admin.underConstruction.saved"),
        "success"
      );
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

  const handleRegenerate = async () => {
    const hadToken = Boolean(status?.hasToken);
    if (hadToken) {
      const ok = await confirm({
        title: t("admin.underConstruction.regenerate"),
        message: t("admin.underConstruction.regenerateConfirm"),
        confirmLabel: t("admin.underConstruction.regenerate"),
        cancelLabel: t("common.cancel"),
        confirmVariant: "danger",
      });
      if (!ok) return;
    }
    try {
      setBusyToken(true);
      const next = await regenerateUnderConstructionToken();
      applyStatus(next);
      showToast(
        hadToken
          ? t("admin.underConstruction.tokenRegenerated")
          : t("admin.underConstruction.tokenReady"),
        "success"
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.underConstruction.saveFailed"),
        "error"
      );
    } finally {
      setBusyToken(false);
    }
  };

  const handleInvalidate = async () => {
    const ok = await confirm({
      title: t("admin.underConstruction.invalidate"),
      message: t("admin.underConstruction.invalidateConfirm"),
      confirmLabel: t("admin.underConstruction.invalidate"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
    });
    if (!ok) return;
    try {
      setBusyToken(true);
      const next = await invalidateUnderConstructionToken();
      applyStatus(next);
      showToast(t("admin.underConstruction.tokenInvalidated"), "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.underConstruction.saveFailed"),
        "error"
      );
    } finally {
      setBusyToken(false);
    }
  };

  const handleCopyLink = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      showToast(t("admin.underConstruction.linkCopied"), "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t("admin.underConstruction.copyFailed"), "error");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner />
      </div>
    );
  }

  const fields = copy[copyLang];
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
          disabled={saving || busyToken}
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
              background: copyLang === code ? "var(--admin-primary, #1e293b)" : "#fff",
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

      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            minHeight: 42,
            padding: "0 16px",
            border: 0,
            borderRadius: 999,
            background: "var(--admin-primary, #1e293b)",
            color: "var(--admin-on-primary, #ffffff)",
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? t("common.loading") : t("admin.underConstruction.save")}
        </button>
      </div>

      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
        {t("admin.underConstruction.accessTitle")}
      </h3>
      <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
        {t("admin.underConstruction.accessHelp", {
          param: status?.queryParam || "access",
        })}
      </p>

      {status?.hasToken && previewUrl ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            maxWidth: 720,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
            {t("admin.underConstruction.previewLink")}
          </div>
          <code
            style={{
              display: "block",
              wordBreak: "break-all",
              fontSize: 13,
              color: "#0f172a",
              marginBottom: 10,
            }}
          >
            {previewUrl}
          </code>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>
            {t("admin.underConstruction.tokenLabel")}
          </div>
          <code style={{ display: "block", wordBreak: "break-all", fontSize: 12, color: "#475569" }}>
            {status.accessToken}
          </code>
          {status.tokenUpdatedAt ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {t("admin.underConstruction.tokenUpdatedAt", {
                date: new Date(status.tokenUpdatedAt).toLocaleString(),
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 14 }}>
          {t("admin.underConstruction.noToken")}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          disabled={!previewUrl || busyToken}
          style={{
            minHeight: 42,
            padding: "0 16px",
            border: 0,
            borderRadius: 999,
            background: previewUrl ? "#0f766e" : "#94a3b8",
            color: "#fff",
            fontWeight: 600,
            cursor: previewUrl ? "pointer" : "not-allowed",
          }}
        >
          {copied ? t("admin.underConstruction.copied") : t("admin.underConstruction.copyLink")}
        </button>
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={busyToken || saving}
          style={{
            minHeight: 42,
            padding: "0 16px",
            border: "1px solid #d1d5db",
            borderRadius: 999,
            background: "#fff",
            color: "#374151",
            fontWeight: 600,
            cursor: busyToken || saving ? "wait" : "pointer",
          }}
        >
          {status?.hasToken
            ? t("admin.underConstruction.regenerate")
            : t("admin.underConstruction.generate")}
        </button>
        <button
          type="button"
          onClick={() => void handleInvalidate()}
          disabled={busyToken || !status?.hasToken}
          style={{
            minHeight: 42,
            padding: "0 16px",
            border: "1px solid #fecaca",
            borderRadius: 999,
            background: "#fff",
            color: "#b91c1c",
            fontWeight: 600,
            cursor: busyToken || !status?.hasToken ? "not-allowed" : "pointer",
          }}
        >
          {t("admin.underConstruction.invalidate")}
        </button>
      </div>
    </div>
  );
}

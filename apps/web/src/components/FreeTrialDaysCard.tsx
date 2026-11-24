/**
 * Admin card: free-plan trial length (days) before auto-suspend of the owner.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFreeTrialDays, setFreeTrialDays } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { AdminSettingsCollapsible } from "./AdminSettingsCollapsible";

export function FreeTrialDaysCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [draft, setDraft] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFreeTrialDays()
      .then((result) => {
        if (!cancelled) {
          setDays(result.days);
          setDraft(String(result.days));
        }
      })
      .catch(() => {
        if (!cancelled) showToast(t("common.error"), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  const save = async () => {
    const next = Number.parseInt(draft, 10);
    if (!Number.isFinite(next) || next < 1) {
      showToast(t("admin.freeTrialDaysInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      const result = await setFreeTrialDays(next);
      setDays(result.days);
      setDraft(String(result.days));
      showToast(t("admin.freeTrialDaysUpdated"), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSettingsCollapsible title={t("admin.freeTrialDays")}>
      <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>
        {t("admin.freeTrialDaysDescription")}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
          <input
            type="number"
            min={1}
            max={3650}
            value={draft}
            disabled={loading || saving}
            onChange={(event) => setDraft(event.target.value)}
            style={{
              width: 96,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--admin-border-subtle)",
              fontSize: 16,
            }}
          />
          <span>{t("admin.freeTrialDaysUnit")}</span>
        </label>
        <button
          type="button"
          disabled={loading || saving || draft === String(days)}
          onClick={() => void save()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--admin-primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: loading || saving ? "not-allowed" : "pointer",
            opacity: loading || saving || draft === String(days) ? 0.6 : 1,
          }}
        >
          {t("common.save")}
        </button>
      </div>
    </AdminSettingsCollapsible>
  );
}

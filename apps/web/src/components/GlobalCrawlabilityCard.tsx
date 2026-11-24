import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGlobalCrawlability, setGlobalCrawlability } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { AdminSettingsCollapsible } from "./AdminSettingsCollapsible";

export function GlobalCrawlabilityCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGlobalCrawlability()
      .then((result) => {
        if (!cancelled) setEnabled(result.isCrawlable);
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

  const save = async (next: boolean) => {
    setSaving(true);
    try {
      const result = await setGlobalCrawlability(next);
      setEnabled(result.isCrawlable);
      showToast(t("admin.globalCrawlabilityUpdated"), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSettingsCollapsible title={t("admin.globalCrawlability")}>
      <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>
        {t("admin.globalCrawlabilityDescription")}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading || saving}
          onChange={(event) => void save(event.target.checked)}
          style={{ width: 20, height: 20, accentColor: "var(--admin-primary)" }}
        />
        <span style={{ fontWeight: 500 }}>{t("admin.globalCrawlabilityEnabled")}</span>
      </label>
    </AdminSettingsCollapsible>
  );
}

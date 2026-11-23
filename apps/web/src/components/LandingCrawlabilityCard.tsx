/**
 * Admin card: toggle indexing for the platform marketing landing (hellolocal.hu overview).
 * Independent of region-site crawl flags; global crawl off still forces noindex.
 * Requires authenticated admin API access (same as App Settings).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getLandingCrawlability, setLandingCrawlability } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

export function LandingCrawlabilityCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLandingCrawlability()
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
      const result = await setLandingCrawlability(next);
      setEnabled(result.isCrawlable);
      showToast(t("admin.landingCrawlabilityUpdated"), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: 24,
        background: "var(--admin-surface)",
        borderRadius: 12,
        border: "1px solid var(--admin-border-subtle)",
        padding: 24,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{t("admin.landingCrawlability")}</h2>
      <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>
        {t("admin.landingCrawlabilityDescription")}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading || saving}
          onChange={(event) => void save(event.target.checked)}
          style={{ width: 20, height: 20, accentColor: "var(--admin-primary)" }}
        />
        <span style={{ fontWeight: 500 }}>{t("admin.landingCrawlabilityEnabled")}</span>
      </label>
    </div>
  );
}

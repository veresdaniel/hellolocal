import { AdminAutocomplete } from "./AdminAutocomplete";
/**
 * Admin: map UI languages (hu/en/de) to a currency from the catalog.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCurrencyByLang,
  getPlatformCurrencies,
  setCurrencyByLang,
  type PlatformCurrency,
} from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { LANG_VALUES } from "../types/enums";

const DEFAULTS: Record<string, string> = { hu: "HUF", en: "EUR", de: "EUR" };

export function CurrencyByLangCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [currencies, setCurrencies] = useState<PlatformCurrency[]>([]);
  const [byLang, setByLang] = useState<Record<string, string>>({ ...DEFAULTS });
  const [saved, setSaved] = useState<Record<string, string>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPlatformCurrencies(), getCurrencyByLang()])
      .then(([list, map]) => {
        if (cancelled) return;
        setCurrencies(list);
        const next = { ...DEFAULTS, ...(map.byLang || {}) };
        setByLang(next);
        setSaved(next);
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

  const dirty = LANG_VALUES.some((lang) => byLang[lang] !== saved[lang]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await setCurrencyByLang(byLang);
      const next = { ...DEFAULTS, ...(result.byLang || {}) };
      setByLang(next);
      setSaved(next);
      showToast(t("admin.currencyByLangUpdated"), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("common.error"), "error");
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
      <h2 style={{ marginTop: 0 }}>{t("admin.currencyByLangTitle")}</h2>
      <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>
        {t("admin.currencyByLangDescription")}
      </p>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          {LANG_VALUES.map((lang) => (
            <label
              key={lang}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: 12,
                alignItems: "center",
                fontWeight: 500,
              }}
            >
              <span style={{ textTransform: "uppercase" }}>{lang}</span>
              <AdminAutocomplete
                value={byLang[lang] || DEFAULTS[lang] || "HUF"}
                disabled={saving}
                options={currencies.map((currency) => ({
                  value: currency.code,
                  label: `${currency.code}${currency.symbol ? ` (${currency.symbol})` : ""} — ${currency.name}`,
                }))}
                onChange={(code) => setByLang((current) => ({ ...current, [lang]: code }))}
                inputStyle={{ padding: "8px 10px", fontSize: 15 }}
              />
            </label>
          ))}
          <button
            type="button"
            disabled={loading || saving || !dirty}
            onClick={() => void save()}
            style={{
              justifySelf: "start",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--admin-primary)",
              color: "#fff",
              fontWeight: 600,
              cursor: loading || saving || !dirty ? "not-allowed" : "pointer",
              opacity: loading || saving || !dirty ? 0.6 : 1,
            }}
          >
            {t("common.save")}
          </button>
        </div>
      )}
    </div>
  );
}

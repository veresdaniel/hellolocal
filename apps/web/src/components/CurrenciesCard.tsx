/**
 * Admin: extensible currency catalog (code, name, plural, symbol).
 */
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  deletePlatformCurrency,
  getPlatformCurrencies,
  upsertPlatformCurrency,
  type PlatformCurrency,
} from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";
import { AdminSettingsCollapsible } from "./AdminSettingsCollapsible";

const BUILTIN = new Set(["HUF", "EUR"]);

function suggestFromCode(code: string): Pick<PlatformCurrency, "name" | "plural" | "symbol"> {
  const known: Record<string, Pick<PlatformCurrency, "name" | "plural" | "symbol">> = {
    HUF: { name: "forint", plural: "forint", symbol: "Ft" },
    EUR: { name: "euro", plural: "euros", symbol: "€" },
    USD: { name: "US dollar", plural: "US dollars", symbol: "$" },
    GBP: { name: "pound", plural: "pounds", symbol: "£" },
  };
  if (known[code]) return known[code];
  try {
    const label = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    if (label) {
      const name = label.toLowerCase();
      return { name, plural: name.endsWith("s") ? name : `${name}s`, symbol: null };
    }
  } catch {
    /* ignore */
  }
  const name = code.toLowerCase();
  return { name, plural: `${name}s`, symbol: null };
}

export function CurrenciesCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [rows, setRows] = useState<PlatformCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftCode, setDraftCode] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftPlural, setDraftPlural] = useState("");
  const [draftSymbol, setDraftSymbol] = useState("");

  const reload = async () => {
    const list = await getPlatformCurrencies();
    setRows(list);
  };

  useEffect(() => {
    let cancelled = false;
    getPlatformCurrencies()
      .then((list) => {
        if (!cancelled) setRows(list);
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

  const onCodeBlur = () => {
    const code = draftCode.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (!code || draftName.trim()) return;
    const suggested = suggestFromCode(code);
    setDraftName(suggested.name);
    setDraftPlural(suggested.plural);
    if (!draftSymbol.trim() && suggested.symbol) setDraftSymbol(suggested.symbol);
  };

  const saveNew = async () => {
    const code = draftCode.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (code.length < 2) {
      showToast(t("admin.currencyCodeInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await upsertPlatformCurrency({
        code,
        name: draftName.trim() || undefined,
        plural: draftPlural.trim() || undefined,
        symbol: draftSymbol.trim() || null,
      });
      setDraftCode("");
      setDraftName("");
      setDraftPlural("");
      setDraftSymbol("");
      await reload();
      showToast(t("admin.currencySaved"), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveRow = async (row: PlatformCurrency) => {
    setSaving(true);
    try {
      await upsertPlatformCurrency(row);
      await reload();
      showToast(t("admin.currencySaved"), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(t("admin.currencyDeleteConfirm", { code }))) return;
    setSaving(true);
    try {
      await deletePlatformCurrency(code);
      await reload();
      showToast(t("admin.currencyDeleted"), "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: CSSProperties = {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--admin-border-subtle)",
    fontSize: 15,
    minWidth: 0,
  };

  return (
    <AdminSettingsCollapsible title={t("admin.currenciesTitle")}>
      <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>{t("admin.currenciesDescription")}</p>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((row) => (
            <div
              key={row.code}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr 1fr 72px auto auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <strong>{row.code}</strong>
              <input
                style={fieldStyle}
                value={row.name}
                disabled={saving}
                aria-label={t("admin.currencyName")}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.code === row.code ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
              <input
                style={fieldStyle}
                value={row.plural}
                disabled={saving}
                aria-label={t("admin.currencyPlural")}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.code === row.code ? { ...item, plural: event.target.value } : item
                    )
                  )
                }
              />
              <input
                style={fieldStyle}
                value={row.symbol ?? ""}
                disabled={saving}
                placeholder={t("admin.currencySymbol")}
                aria-label={t("admin.currencySymbol")}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.code === row.code
                        ? { ...item, symbol: event.target.value || null }
                        : item
                    )
                  )
                }
              />
              <button type="button" disabled={saving} onClick={() => void saveRow(row)}>
                {t("common.save")}
              </button>
              <button
                type="button"
                disabled={saving || BUILTIN.has(row.code)}
                onClick={() => void remove(row.code)}
                title={BUILTIN.has(row.code) ? t("admin.currencyBuiltinLocked") : undefined}
              >
                {t("common.delete")}
              </button>
            </div>
          ))}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 1fr 72px auto",
              gap: 8,
              alignItems: "center",
              marginTop: 8,
              paddingTop: 12,
              borderTop: "1px solid var(--admin-border-subtle)",
            }}
          >
            <input
              style={fieldStyle}
              value={draftCode}
              disabled={saving}
              placeholder="EUR"
              aria-label={t("admin.currencyCode")}
              onChange={(event) => setDraftCode(event.target.value.toUpperCase())}
              onBlur={onCodeBlur}
            />
            <input
              style={fieldStyle}
              value={draftName}
              disabled={saving}
              placeholder={t("admin.currencyName")}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <input
              style={fieldStyle}
              value={draftPlural}
              disabled={saving}
              placeholder={t("admin.currencyPlural")}
              onChange={(event) => setDraftPlural(event.target.value)}
            />
            <input
              style={fieldStyle}
              value={draftSymbol}
              disabled={saving}
              placeholder={t("admin.currencySymbol")}
              onChange={(event) => setDraftSymbol(event.target.value)}
            />
            <button type="button" disabled={saving} onClick={() => void saveNew()}>
              {t("admin.currencyAdd")}
            </button>
          </div>
        </div>
      )}
    </AdminSettingsCollapsible>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUiMessages, saveUiMessages } from "../api/uiCopy.api";
import { applyUiCopy, invalidateUiCopy } from "../i18n/loadUiCopy";
import { landingDefault } from "./landingCopy";
import { isUiLang, LANG_VALUES, type Lang, type UiLang } from "../types/enums";
import { useToast } from "../contexts/ToastContext";
import languagesMeta from "../i18n/languages.json";

const LANG_LABEL: Record<string, string> = Object.fromEntries(
  (languagesMeta.languages || []).map((row: { code: string; endonym: string }) => [
    row.code,
    row.endonym,
  ])
);

const KEY_PREFIX = "public.overview.";

type FieldDef = {
  path: string;
  label: Record<UiLang, string>;
  long?: boolean;
};

const DEMO_FIELDS: FieldDef[] = [
  {
    path: "demo.sentTitle",
    label: { hu: "Demó — sikeres cím", en: "Demo — success title", de: "Demo — Erfolgstitel" },
  },
  {
    path: "demo.sentLead",
    label: {
      hu: "Demó — sikeres szöveg",
      en: "Demo — success body",
      de: "Demo — Erfolgtext",
    },
    long: true,
  },
  {
    path: "demo.storedTitle",
    label: {
      hu: "Demó — email nélkül (cím)",
      en: "Demo — no email title",
      de: "Demo — ohne E-Mail (Titel)",
    },
  },
  {
    path: "demo.storedLead",
    label: {
      hu: "Demó — email nélkül (szöveg)",
      en: "Demo — no email body",
      de: "Demo — ohne E-Mail (Text)",
    },
    long: true,
  },
  {
    path: "demo.noRecipientTitle",
    label: {
      hu: "Demó — nincs címzett (cím)",
      en: "Demo — no recipient title",
      de: "Demo — kein Empfänger (Titel)",
    },
  },
  {
    path: "demo.noRecipientLead",
    label: {
      hu: "Demó — nincs címzett (szöveg)",
      en: "Demo — no recipient body",
      de: "Demo — kein Empfänger (Text)",
    },
    long: true,
  },
];

const QUOTE_FIELDS: FieldDef[] = [
  {
    path: "plans.quote.sentTitle",
    label: {
      hu: "Ajánlat — sikeres cím",
      en: "Quote — success title",
      de: "Angebot — Erfolgstitel",
    },
  },
  {
    path: "plans.quote.sentLead",
    label: {
      hu: "Ajánlat — sikeres szöveg",
      en: "Quote — success body",
      de: "Angebot — Erfolgtext",
    },
    long: true,
  },
  {
    path: "plans.quote.storedTitle",
    label: {
      hu: "Ajánlat — email nélkül (cím)",
      en: "Quote — no email title",
      de: "Angebot — ohne E-Mail (Titel)",
    },
  },
  {
    path: "plans.quote.storedLead",
    label: {
      hu: "Ajánlat — email nélkül (szöveg)",
      en: "Quote — no email body",
      de: "Angebot — ohne E-Mail (Text)",
    },
    long: true,
  },
  {
    path: "plans.quote.noRecipientTitle",
    label: {
      hu: "Ajánlat — nincs címzett (cím)",
      en: "Quote — no recipient title",
      de: "Angebot — kein Empfänger (Titel)",
    },
  },
  {
    path: "plans.quote.noRecipientLead",
    label: {
      hu: "Ajánlat — nincs címzett (szöveg)",
      en: "Quote — no recipient body",
      de: "Angebot — kein Empfänger (Text)",
    },
    long: true,
  },
];

const ALL_FIELDS = [...DEMO_FIELDS, ...QUOTE_FIELDS];

type Drafts = Record<Lang, Record<string, string>>;

function emptyDrafts(): Drafts {
  return Object.fromEntries(LANG_VALUES.map((lang) => [lang, {}])) as Drafts;
}

/**
 * Superadmin editor for demo / municipal-quote success & mail-status copy (UiMessage).
 */
export function LeadStatusCopyEditor() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const uiLang: Lang = isUiLang(i18n.language) ? i18n.language : "hu";
  const [active, setActive] = useState<Lang>(uiLang);
  const [drafts, setDrafts] = useState<Drafts>(() => emptyDrafts());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const next = emptyDrafts();
      for (const code of LANG_VALUES) {
        try {
          const data = await getUiMessages(code);
          const map: Record<string, string> = {};
          for (const entry of data.entries) {
            if (!entry.key.startsWith(KEY_PREFIX)) continue;
            map[entry.key.slice(KEY_PREFIX.length)] = entry.value;
          }
          for (const field of ALL_FIELDS) {
            next[code][field.path] = map[field.path]?.trim() || landingDefault(code, field.path);
          }
        } catch {
          /* leave empty; locale fallback still works on the public page */
        }
      }
      if (!cancelled) {
        setDrafts(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      for (const code of LANG_VALUES) {
        const entries: Record<string, string> = {};
        for (const field of ALL_FIELDS) {
          const value = (drafts[code][field.path] ?? "").trim();
          if (value) entries[`${KEY_PREFIX}${field.path}`] = value.slice(0, 8000);
        }
        if (Object.keys(entries).length) await saveUiMessages(code, entries);
        invalidateUiCopy(code);
        void applyUiCopy(code);
      }
      showToast(t("admin.leadStatusCopy.saved"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const labelLang: UiLang = isUiLang(uiLang) ? uiLang : "hu";

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "var(--admin-muted)" }}>
        {t("admin.leadStatusCopy.help")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {LANG_VALUES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setActive(code)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: active === code ? "none" : "1px solid var(--admin-border-subtle)",
              background: active === code ? "var(--admin-primary)" : "var(--admin-surface)",
              color: active === code ? "#fff" : "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {LANG_LABEL[code] || code.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p>{t("admin.leadStatusCopy.loading")}</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <h3 style={{ margin: "8px 0 0", fontSize: 16 }}>{t("admin.leadStatusCopy.demoGroup")}</h3>
          {DEMO_FIELDS.map((field) => (
            <label key={field.path} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{field.label[labelLang]}</span>
              {field.long ? (
                <textarea
                  rows={3}
                  value={drafts[active][field.path] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [active]: { ...current[active], [field.path]: event.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--admin-border-subtle)",
                    font: "inherit",
                  }}
                />
              ) : (
                <input
                  value={drafts[active][field.path] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [active]: { ...current[active], [field.path]: event.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--admin-border-subtle)",
                    font: "inherit",
                  }}
                />
              )}
            </label>
          ))}

          <h3 style={{ margin: "16px 0 0", fontSize: 16 }}>{t("admin.leadStatusCopy.quoteGroup")}</h3>
          {QUOTE_FIELDS.map((field) => (
            <label key={field.path} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{field.label[labelLang]}</span>
              {field.long ? (
                <textarea
                  rows={3}
                  value={drafts[active][field.path] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [active]: { ...current[active], [field.path]: event.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--admin-border-subtle)",
                    font: "inherit",
                  }}
                />
              ) : (
                <input
                  value={drafts[active][field.path] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [active]: { ...current[active], [field.path]: event.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--admin-border-subtle)",
                    font: "inherit",
                  }}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
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
          {saving ? t("admin.saving") : t("admin.leadStatusCopy.save")}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { languageLabel } from "../utils/langFields";
import { flattenMessages, UI_COPY_NAMESPACES } from "../i18n/uiMessages";
import {
  addUiLanguage,
  getUiMessages,
  removeUiLanguage,
  saveUiMessages,
  syncUiCatalogs,
  type UiCopyEntry,
} from "../api/uiCopy.api";

const PAGE_SIZE = 40;
const localeModules = import.meta.glob("../i18n/locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function bundledCatalogs(): Record<string, Record<string, string>> {
  const catalogs: Record<string, Record<string, string>> = {};
  for (const [file, data] of Object.entries(localeModules)) {
    const match = file.match(/\/([a-z]{2,3})\/([^/]+)\.json$/);
    if (!match) continue;
    const [, lang, namespace] = match;
    if (!UI_COPY_NAMESPACES.includes(namespace as (typeof UI_COPY_NAMESPACES)[number])) continue;
    if (lang !== "hu" && lang !== "en" && lang !== "de") continue;
    catalogs[lang] ??= {};
    flattenMessages(data, namespace, catalogs[lang]);
  }
  return catalogs;
}

export type UiCopyKeyFilter = (key: string) => boolean;

export function UiCopyEditor({
  keyFilter,
  showLanguageManager = true,
  showNamespaceFilter = false,
}: {
  keyFilter?: UiCopyKeyFilter;
  showLanguageManager?: boolean;
  showNamespaceFilter?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [languages, setLanguages] = useState<string[]>([]);
  const [lang, setLang] = useState("hu");
  const [entries, setEntries] = useState<UiCopyEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("all");
  const [page, setPage] = useState(0);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async (nextLang: string) => {
    setLoading(true);
    setError("");
    try {
      await syncUiCatalogs(bundledCatalogs());
      const data = await getUiMessages(nextLang);
      setLanguages(data.languages);
      setLang(data.lang);
      setEntries(data.entries);
      setDrafts(Object.fromEntries(data.entries.map((entry) => [entry.key, entry.value])));
      setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.uiCopyLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("hu");
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (keyFilter && !keyFilter(entry.key)) return false;
      if (showNamespaceFilter && namespace !== "all" && !entry.key.startsWith(`${namespace}.`)) {
        return false;
      }
      if (!needle) return true;
      const value = drafts[entry.key] ?? "";
      return (
        entry.key.toLowerCase().includes(needle) ||
        value.toLowerCase().includes(needle) ||
        entry.reference.toLowerCase().includes(needle)
      );
    });
  }, [entries, drafts, query, namespace, keyFilter, showNamespaceFilter]);

  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const dirty = filtered.filter((entry) => (drafts[entry.key] ?? "") !== entry.value);

  const addLanguage = async () => {
    setNotice("");
    setError("");
    try {
      const result = await addUiLanguage(code);
      setLanguages(result.languages);
      setCode("");
      const added = code.trim().toLowerCase().split("-")[0];
      if (added) await load(added);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.uiCopyLoadFailed"));
    }
  };

  const removeLanguage = async (target: string) => {
    if (target === "hu") return;
    if (!window.confirm(t("admin.uiCopyRemoveConfirm", { lang: target.toUpperCase() }))) return;
    setError("");
    try {
      const result = await removeUiLanguage(target);
      setLanguages(result.languages);
      await load("hu");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.uiCopyLoadFailed"));
    }
  };

  const save = async () => {
    if (!dirty.length) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const entriesToSave: Record<string, string> = {};
      for (const entry of dirty) entriesToSave[entry.key] = drafts[entry.key] ?? "";
      await saveUiMessages(lang, entriesToSave);
      setEntries((current) =>
        current.map((entry) => ({ ...entry, value: drafts[entry.key] ?? entry.value }))
      );
      setNotice(t("admin.uiCopySaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.uiCopyLoadFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error ? (
        <p style={{ padding: 16, background: "#fff4f2", borderRadius: 12, color: "#8a2b16" }}>{error}</p>
      ) : null}
      {notice ? (
        <p style={{ padding: 16, background: "#f3f7f1", borderRadius: 12, color: "#245c32" }}>{notice}</p>
      ) : null}

      {showLanguageManager ? (
        <section
          style={{
            background: "white",
            border: "1px solid #e0e0e0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {languages.map((item) => (
              <span key={item} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => void load(item)}
                  style={{
                    borderRadius: 999,
                    border: item === lang ? "1px solid #1b1730" : "1px solid #ddd",
                    background: item === lang ? "#1b1730" : "white",
                    color: item === lang ? "white" : "#1b1730",
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontWeight: 650,
                  }}
                >
                  {languageLabel(item, i18n.language)}
                </button>
                {item !== "hu" ? (
                  <button
                    type="button"
                    onClick={() => void removeLanguage(item)}
                    style={{ border: 0, background: "transparent", cursor: "pointer" }}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addLanguage();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t("admin.uiCopyCode")}
              aria-label={t("admin.uiCopyCode")}
              maxLength={3}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px", width: 160 }}
            />
            <button
              type="submit"
              style={{
                border: 0,
                borderRadius: 8,
                background: "#1b1730",
                color: "white",
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              {t("admin.uiCopyAdd")}
            </button>
          </form>
        </section>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {languages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void load(item)}
              style={{
                borderRadius: 999,
                border: item === lang ? "1px solid #1b1730" : "1px solid #ddd",
                background: item === lang ? "#1b1730" : "white",
                color: item === lang ? "white" : "#1b1730",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 650,
              }}
            >
              {languageLabel(item, i18n.language)}
            </button>
          ))}
        </div>
      )}

      <section style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={t("admin.uiCopySearch")}
            aria-label={t("admin.uiCopySearch")}
            style={{ flex: 1, minWidth: 220, border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px" }}
          />
          {showNamespaceFilter ? (
            <select
              value={namespace}
              onChange={(event) => {
                setNamespace(event.target.value);
                setPage(0);
              }}
              aria-label={t("admin.uiCopyNamespace")}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px" }}
            >
              <option value="all">{t("admin.uiCopyAll")}</option>
              {UI_COPY_NAMESPACES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty.length || saving}
            style={{
              border: 0,
              borderRadius: 8,
              background: dirty.length ? "#1b1730" : "#ccc",
              color: "white",
              padding: "10px 16px",
              cursor: dirty.length ? "pointer" : "default",
            }}
          >
            {saving ? t("admin.saving") : t("admin.uiCopySave", { n: dirty.length })}
          </button>
        </div>

        {loading ? <p>{t("admin.uiCopyLoading")}</p> : null}
        {!loading && !visible.length ? <p>{t("admin.uiCopyEmpty")}</p> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((entry) => (
            <label key={entry.key} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#666" }}>
                {entry.key}
              </span>
              {lang !== "hu" && entry.reference ? (
                <span style={{ color: "#777", fontSize: 13 }}>{entry.reference}</span>
              ) : null}
              <textarea
                value={drafts[entry.key] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [entry.key]: event.target.value }))
                }
                rows={Math.min(6, Math.max(2, Math.ceil((drafts[entry.key] || "").length / 90)))}
                style={{
                  width: "100%",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 10,
                  font: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </label>
          ))}
        </div>

        {pages > 1 ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
            <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
              ‹
            </button>
            <span>
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

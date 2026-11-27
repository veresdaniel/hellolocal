import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getAdminPathSegments,
  saveAdminPathSegments,
  type PathSegmentsPayload,
} from "../api/uiCopy.api";
import { PATH_SEGMENT_KEYS, type PathSegmentKey } from "../app/pathSegmentKeys";
import { setPathSegmentsPayload } from "../app/pathSegmentsStore";
import { useToast } from "../contexts/ToastContext";

const KEY_LABELS: Record<PathSegmentKey, string> = {
  place: "Place detail",
  town: "Town",
  map: "Map",
  list: "List",
  regionList: "Region list",
  overview: "Overview (legacy)",
  pricing: "Pricing",
  guide: "Guide",
  "legal.imprint": "Legal — imprint",
  "legal.terms": "Legal — terms",
  "legal.privacy": "Legal — privacy",
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function PathSegmentsEditor() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-path-segments"],
    queryFn: getAdminPathSegments,
  });

  const languages = query.data?.languages ?? [];
  const [lang, setLang] = useState("hu");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!languages.length) return;
    setLang((prev) => (languages.includes(prev) ? prev : languages[0]));
  }, [languages]);

  useEffect(() => {
    const map = query.data?.byLang?.[lang];
    if (!map) return;
    setDrafts({ ...map });
  }, [query.data, lang]);

  const clashes = useMemo(() => {
    const bySegment = new Map<string, string[]>();
    for (const key of PATH_SEGMENT_KEYS) {
      const segment = (drafts[key] || "").trim().toLowerCase();
      if (!segment) continue;
      const list = bySegment.get(segment) || [];
      list.push(key);
      bySegment.set(segment, list);
    }
    // Cross-language same-key is OK; different key is not (matches API).
    const other = query.data?.aliases || {};
    const problems: Record<string, string> = {};
    for (const key of PATH_SEGMENT_KEYS) {
      const segment = (drafts[key] || "").trim().toLowerCase();
      if (!segment) {
        problems[key] = "Üres";
        continue;
      }
      if (!SLUG_RE.test(segment) || segment.length > 32) {
        problems[key] = "Érvénytelen slug";
        continue;
      }
      const local = bySegment.get(segment) || [];
      if (local.length > 1) {
        problems[key] = `Ütközés: ${local.join(", ")}`;
        continue;
      }
      const alias = other[segment];
      if (alias && alias.key !== key) {
        problems[key] = `Foglalt: ${alias.key}`;
      }
    }
    return problems;
  }, [drafts, query.data?.aliases]);

  const save = useMutation({
    mutationFn: () => saveAdminPathSegments(lang, drafts),
    onSuccess: async (payload: PathSegmentsPayload) => {
      setPathSegmentsPayload(payload);
      await queryClient.invalidateQueries({ queryKey: ["admin-path-segments"] });
      showToast(t("admin.saved", { defaultValue: "Mentve" }), "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  if (query.isLoading) return <p>…</p>;
  if (query.isError) return <p>{(query.error as Error).message}</p>;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{t("admin.pathSegments", { defaultValue: "URL-szegmensek" })}</h2>
      <p className="admin-page-muted" style={{ margin: "0 0 16px", maxWidth: 720, lineHeight: 1.5 }}>
        {t("admin.pathSegmentsHint", {
          defaultValue:
            "Nyelvenkénti URL-szavak (hely, térkép, útmutató…). Új nyelv felvételekor a beépített szótár vagy angol kerül ide; itt átírhatók.",
        })}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {languages.map((code) => (
          <button
            key={code}
            type="button"
            className={lang === code ? "is-on" : ""}
            onClick={() => setLang(code)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: lang === code ? "#111" : "#fff",
              color: lang === code ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        {PATH_SEGMENT_KEYS.map((key) => (
          <label key={key} style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {KEY_LABELS[key]} <code style={{ fontWeight: 400 }}>{key}</code>
            </span>
            <input
              value={drafts[key] || ""}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [key]: event.target.value.toLowerCase() }))
              }
              spellCheck={false}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: clashes[key] ? "1px solid #c44" : "1px solid #ccc",
              }}
            />
            {clashes[key] ? (
              <span style={{ color: "#c44", fontSize: 12 }}>{clashes[key]}</span>
            ) : null}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending || Object.keys(clashes).length > 0}
        style={{ marginTop: 16, padding: "10px 16px", cursor: "pointer" }}
      >
        {save.isPending ? "…" : t("admin.save", { defaultValue: "Mentés" })}
      </button>
    </section>
  );
}

import { useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  requestContentDraft,
  type ContentDraftField,
  type ContentDraftKind,
} from "../api/admin.api";
import { AuthContext } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../hooks/useConfirm";
import {
  useContentDraftStatus,
  clearContentDraftStatusCache,
} from "../hooks/useContentDraftStatus";
import { hasVisibleHtml } from "../utils/hasVisibleHtml";
import { isSuperadmin } from "../utils/roleHelpers";

export type AiAssistantActionId = ContentDraftField | "seoKeywords" | "seoScore";

export type AiAssistantAction = {
  id: AiAssistantActionId;
  /** Draft API field; omit for local-only actions (seoScore). */
  field?: ContentDraftField;
  icon: string;
  labelKey: string;
};

const DEFAULT_ACTIONS: Record<string, AiAssistantAction[]> = {
  site: [
    { id: "name", field: "name", icon: "💡", labelKey: "admin.contentDraft.actions.suggestName" },
    {
      id: "shortDescription",
      field: "shortDescription",
      icon: "📝",
      labelKey: "admin.contentDraft.actions.excerpt",
    },
    {
      id: "description",
      field: "description",
      icon: "✍️",
      labelKey: "admin.contentDraft.actions.description",
    },
    { id: "intro", field: "intro", icon: "🗺️", labelKey: "admin.contentDraft.actions.intro" },
    { id: "seoScore", icon: "📊", labelKey: "admin.contentDraft.actions.seoScore" },
  ],
  place: [
    { id: "name", field: "name", icon: "💡", labelKey: "admin.contentDraft.actions.suggestName" },
    {
      id: "seoTitle",
      field: "seoTitle",
      icon: "🔎",
      labelKey: "admin.contentDraft.actions.seoTitle",
    },
    {
      id: "seoDescription",
      field: "seoDescription",
      icon: "✍️",
      labelKey: "admin.contentDraft.actions.seoDescription",
    },
    {
      id: "shortDescription",
      field: "shortDescription",
      icon: "📝",
      labelKey: "admin.contentDraft.actions.excerpt",
    },
    {
      id: "description",
      field: "description",
      icon: "📄",
      labelKey: "admin.contentDraft.actions.description",
    },
    {
      id: "seoKeywords",
      field: "seoDescription",
      icon: "🏷️",
      labelKey: "admin.contentDraft.actions.keywords",
    },
    { id: "seoScore", icon: "📊", labelKey: "admin.contentDraft.actions.seoScore" },
  ],
  event: [
    {
      id: "title",
      field: "title",
      icon: "💡",
      labelKey: "admin.contentDraft.actions.suggestTitle",
    },
    {
      id: "shortDescription",
      field: "shortDescription",
      icon: "📝",
      labelKey: "admin.contentDraft.actions.excerpt",
    },
    {
      id: "description",
      field: "description",
      icon: "📄",
      labelKey: "admin.contentDraft.actions.description",
    },
    { id: "seoScore", icon: "📊", labelKey: "admin.contentDraft.actions.seoScore" },
  ],
  town: [
    { id: "name", field: "name", icon: "💡", labelKey: "admin.contentDraft.actions.suggestName" },
    {
      id: "shortDescription",
      field: "shortDescription",
      icon: "📝",
      labelKey: "admin.contentDraft.actions.excerpt",
    },
    {
      id: "description",
      field: "description",
      icon: "📄",
      labelKey: "admin.contentDraft.actions.description",
    },
  ],
  collection: [
    {
      id: "title",
      field: "title",
      icon: "💡",
      labelKey: "admin.contentDraft.actions.suggestTitle",
    },
    {
      id: "description",
      field: "description",
      icon: "📄",
      labelKey: "admin.contentDraft.actions.description",
    },
  ],
  default: [
    { id: "name", field: "name", icon: "💡", labelKey: "admin.contentDraft.actions.suggestName" },
    {
      id: "shortDescription",
      field: "shortDescription",
      icon: "📝",
      labelKey: "admin.contentDraft.actions.excerpt",
    },
    {
      id: "description",
      field: "description",
      icon: "📄",
      labelKey: "admin.contentDraft.actions.description",
    },
  ],
};

type Props = {
  kind: ContentDraftKind;
  lang: string;
  siteId?: string;
  placeId?: string;
  name?: string;
  categoryId?: string;
  townId?: string;
  values: Partial<Record<ContentDraftField | "seoKeywords", string>>;
  onApply: (field: ContentDraftField | "seoKeywords", text: string) => void;
  actions?: AiAssistantAction[];
  /** localStorage key for open/closed preference */
  storageKey?: string;
  style?: CSSProperties;
};

function draftErrorMessage(err: unknown, t: (key: string) => string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw.includes("content_draft_disabled")) return t("admin.contentDraft.disabled");
  if (raw.includes("content_draft_needs_name")) return t("admin.contentDraft.needsName");
  if (raw.includes("content_draft_auth") || raw.includes("401")) {
    return t("admin.contentDraft.authFailed");
  }
  if (raw.includes("content_draft_rate_limited") || raw.includes("429")) {
    return t("admin.contentDraft.rateLimited");
  }
  if (raw.includes("content_draft_forbidden") || raw.includes("403")) {
    return t("admin.contentDraft.notAllowed");
  }
  if (raw.includes("content_draft_failed") || raw.includes("content_draft_invalid")) {
    return t("admin.contentDraft.failed");
  }
  return raw || t("admin.contentDraft.failed");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildSeoScore(
  values: Props["values"],
  t: (key: string, opts?: Record<string, unknown>) => string
): { score: number; tips: string[] } {
  const title = stripHtml(values.seoTitle || values.name || values.title || "");
  const meta = stripHtml(values.seoDescription || "");
  const excerpt = stripHtml(values.shortDescription || "");
  const body = stripHtml(values.description || "");
  const keywords = stripHtml(values.seoKeywords || "");

  const tips: string[] = [];
  let score = 0;

  if (title.length >= 20 && title.length <= 60) {
    score += 25;
  } else if (title) {
    score += 10;
    tips.push(t("admin.contentDraft.seoTips.titleLength", { count: title.length }));
  } else {
    tips.push(t("admin.contentDraft.seoTips.titleMissing"));
  }

  if (meta.length >= 70 && meta.length <= 160) {
    score += 25;
  } else if (meta) {
    score += 10;
    tips.push(t("admin.contentDraft.seoTips.metaLength", { count: meta.length }));
  } else {
    tips.push(t("admin.contentDraft.seoTips.metaMissing"));
  }

  if (excerpt.length >= 40) score += 20;
  else tips.push(t("admin.contentDraft.seoTips.excerptShort"));

  if (body.length >= 120) score += 20;
  else tips.push(t("admin.contentDraft.seoTips.bodyShort"));

  if (keywords.split(/[,;]/).filter(Boolean).length >= 3) score += 10;
  else if (values.seoKeywords !== undefined) tips.push(t("admin.contentDraft.seoTips.keywordsFew"));
  else score += 10; // kinds without keywords don't lose points

  return { score: Math.min(100, score), tips };
}

/**
 * Fixed bottom-right collapsible AI Assistant dock for admin editors.
 * Not inline in the form — floats above page chrome.
 */
export function AiAssistantPanel({
  kind,
  lang,
  siteId,
  placeId,
  name,
  categoryId,
  townId,
  values,
  onApply,
  actions: actionsProp,
  storageKey = `hl-ai-assistant:${kind}`,
  style,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const auth = useContext(AuthContext);
  const userIsSuperadmin = auth?.user?.role ? isSuperadmin(auth.user.role as never) : false;
  // Per-user opt-in; default false. Superadmins are migrated/created with true but can turn off.
  const userAiEnabled = Boolean(auth?.user?.aiAssistantEnabled);
  const { ready, enabled, allowed, visible } = useContentDraftStatus(siteId, placeId);

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [guidelines, setGuidelines] = useState("");
  const [busyId, setBusyId] = useState<AiAssistantActionId | null>(null);
  const [seoReport, setSeoReport] = useState<{ score: number; tips: string[] } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  const actions = useMemo(() => {
    if (actionsProp?.length) return actionsProp;
    return DEFAULT_ACTIONS[kind] || DEFAULT_ACTIONS.default;
  }, [actionsProp, kind]);

  // Hide dock entirely unless the user opted in (and is allowed to draft).
  if (!userAiEnabled || !ready || !visible) return null;

  const gated = !enabled;
  const langPrefix = langParam ? `/${langParam}` : "";

  const goToSettings = () => {
    clearContentDraftStatusCache();
    navigate(`${langPrefix}/admin/platform-settings#content-draft`);
  };

  const runAction = async (action: AiAssistantAction) => {
    if (action.id === "seoScore") {
      setSeoReport(buildSeoScore(values, t));
      return;
    }

    if (gated) {
      showToast(t("admin.contentDraft.disabled"), "info");
      if (userIsSuperadmin) goToSettings();
      return;
    }

    const field = action.field;
    if (!field) return;

    const naming = field === "name" || field === "title";
    if (!naming && !name?.trim() && !guidelines.trim()) {
      showToast(t("admin.contentDraft.needsName"), "error");
      return;
    }
    if (naming && !name?.trim() && !guidelines.trim()) {
      showToast(t("admin.contentDraft.needsContext"), "error");
      return;
    }

    const applyKey: ContentDraftField | "seoKeywords" =
      action.id === "seoKeywords" ? "seoKeywords" : field;
    const existing =
      action.id === "seoKeywords" ? values.seoKeywords || "" : values[field] || "";

    if (hasVisibleHtml(existing) || (existing && !/<[a-z]/i.test(existing) && existing.trim())) {
      const ok = await confirm({
        title: t("admin.contentDraft.confirmReplaceTitle"),
        message: t("admin.contentDraft.confirmReplaceField"),
        confirmLabel: t("admin.contentDraft.replace"),
        cancelLabel: t("common.cancel"),
        confirmVariant: "primary",
      });
      if (!ok) return;
    }

    const keywordHint =
      action.id === "seoKeywords"
        ? "Return 5 to 8 short SEO keywords as a single comma-separated list only. No sentences."
        : undefined;

    try {
      setBusyId(action.id);
      const result = await requestContentDraft({
        kind,
        field: action.id === "seoKeywords" ? "seoDescription" : field,
        siteId,
        placeId,
        lang,
        name,
        contextHints: [guidelines.trim(), keywordHint].filter(Boolean).join("\n") || undefined,
        categoryId,
        townId,
        existingValue: existing,
      });
      let text = (result.text || "").trim();
      if (!text) {
        showToast(t("admin.contentDraft.failed"), "error");
        return;
      }
      if (action.id === "seoKeywords") {
        text = stripHtml(text)
          .replace(/^["']|["']$/g, "")
          .split(/[,;\n]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 12)
          .join(", ");
      }
      onApply(applyKey, text);
      showToast(t("admin.contentDraft.applied"), "success");
    } catch (err) {
      showToast(draftErrorMessage(err, t), "error");
    } finally {
      setBusyId(null);
    }
  };

  const dock = (
    <section
      className="ai-assistant-panel ai-assistant-panel--dock"
      aria-label={t("admin.contentDraft.assistantTitle")}
      style={{
        position: "fixed",
        right: "max(12px, env(safe-area-inset-right))",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        zIndex: 1200,
        width: "min(360px, calc(100vw - 24px))",
        maxHeight: "min(70vh, 560px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--admin-border, #cbd5e1)",
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.22)",
        background: "var(--admin-surface, #fff)",
        fontFamily: "var(--admin-font)",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          background: gated ? "var(--admin-secondary, #64748b)" : "var(--admin-accent, #2563eb)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span aria-hidden="true">🤖</span>
        <span style={{ flex: 1 }}>{t("admin.contentDraft.assistantTitle")}</span>
        {gated ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(255,255,255,0.18)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {t("admin.contentDraft.statusOff")}
          </span>
        ) : null}
        <span aria-hidden="true" style={{ fontSize: 12 }}>
          {open ? "▼" : "▲"}
        </span>
      </button>

      {open ? (
        <div
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {gated ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              <div style={{ marginBottom: userIsSuperadmin ? 8 : 0 }}>
                {t("admin.contentDraft.disabled")}
              </div>
              {userIsSuperadmin ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={goToSettings}
                  style={{ padding: "8px 12px", fontSize: 13 }}
                >
                  {t("admin.contentDraft.openSettings")}
                </button>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--admin-muted, #475569)", lineHeight: 1.45 }}>
              {t("admin.contentDraft.hint")}
            </p>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink, #0f172a)" }}>
              {t("admin.contentDraft.guidelinesLabel")}
            </span>
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder={t("admin.contentDraft.guidelinesPlaceholder")}
              rows={2}
              disabled={Boolean(busyId)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--admin-border, #cbd5e1)",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
                color: "var(--admin-ink, #0f172a)",
                background: "#fff",
              }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {actions.map((action) => {
              const busy = busyId === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void runAction(action)}
                  disabled={Boolean(busyId) && !busy}
                  aria-busy={busy}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--admin-border-subtle)",
                    background: gated && action.id !== "seoScore" ? "#f8fafc" : "#f1f5f9",
                    color:
                      gated && action.id !== "seoScore"
                        ? "#94a3b8"
                        : "var(--admin-ink, #0f172a)",
                    cursor: busyId && !busy ? "wait" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  <span style={{ flex: 1 }}>
                    {busy ? t("admin.contentDraft.generating") : t(action.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {allowed && !gated ? (
            <p style={{ margin: 0, fontSize: 11, color: "var(--admin-muted, #475569)" }}>
              {t("admin.contentDraft.assistantFooter")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  const scoreCard = seoReport ? (
    <aside className="ai-seo-card" role="status" aria-live="polite">
      <div className="ai-seo-card__head">
        <strong>{t("admin.contentDraft.seoTips.score", { score: seoReport.score })}</strong>
        <button type="button" onClick={() => setSeoReport(null)} aria-label={t("common.close")}>
          ×
        </button>
      </div>
      {seoReport.tips.length > 0 ? (
        <ul>
          {seoReport.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : (
        <p>{t("admin.contentDraft.seoTips.noTips")}</p>
      )}
    </aside>
  ) : null;

  if (typeof document === "undefined") return dock;
  return createPortal(
    <>
      <style>{`
        .ai-seo-card {
          position: fixed;
          z-index: 1200;
          right: calc(24px + min(360px, calc(100vw - 24px)));
          bottom: max(16px, env(safe-area-inset-bottom));
          width: min(320px, calc(100vw - 36px - min(360px, calc(100vw - 24px))));
          max-height: min(70vh, 420px);
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 16px;
          overflow: auto;
          box-sizing: border-box;
          border: 1px solid var(--admin-border, #cbd5e1);
          border-radius: 12px;
          background: var(--admin-surface, #fff);
          color: var(--admin-ink, #0f172a);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.22);
          font-family: var(--admin-font, Inter, system-ui, sans-serif);
          font-size: 15px;
          line-height: 1.5;
        }
        .ai-seo-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .ai-seo-card__head strong {
          font-size: 16px;
          line-height: 1.4;
        }
        .ai-seo-card__head button {
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }
        .ai-seo-card ul {
          margin: 0;
          padding-left: 18px;
        }
        .ai-seo-card li + li {
          margin-top: 6px;
        }
        .ai-seo-card p {
          margin: 0;
        }
        @media (max-width: 760px) {
          .ai-seo-card {
            top: 72px;
            right: 12px;
            left: 12px;
            bottom: auto;
            width: auto;
            max-height: min(40vh, 280px);
          }
        }
      `}</style>
      {scoreCard}
      {dock}
    </>,
    document.body
  );
}

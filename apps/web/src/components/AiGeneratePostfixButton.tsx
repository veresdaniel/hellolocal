import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  requestContentDraft,
  type ContentDraftField,
  type ContentDraftKind,
} from "../api/admin.api";
import { useConfirm } from "../hooks/useConfirm";
import { useContentDraftStatus } from "../hooks/useContentDraftStatus";
import { useToast } from "../contexts/ToastContext";
import { hasVisibleHtml } from "../utils/hasVisibleHtml";

export type AiDraftTarget = {
  kind: ContentDraftKind;
  field: ContentDraftField;
  lang: string;
  siteId?: string;
  placeId?: string;
  /** Entity name/title used as prompt context. */
  name?: string;
  contextHints?: string;
  categoryId?: string;
  townId?: string;
};

type Props = {
  draft: AiDraftTarget;
  value: string;
  onApply: (text: string) => void;
  /** `input` sits inside the field; `toolbar` sits in TipTap chrome. */
  variant?: "input" | "textarea" | "toolbar";
  style?: CSSProperties;
};

function draftErrorMessage(err: unknown, t: (key: string) => string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw.includes("content_draft_disabled")) return t("admin.contentDraft.disabled");
  if (raw.includes("content_draft_needs_name")) return t("admin.contentDraft.needsName");
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

export function AiGeneratePostfixButton({
  draft,
  value,
  onApply,
  variant = "input",
  style,
}: Props) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const { visible, enabled } = useContentDraftStatus(draft.siteId, draft.placeId);
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const run = async () => {
    if (!enabled) {
      showToast(t("admin.contentDraft.disabled"), "info");
      return;
    }

    const naming = draft.field === "name" || draft.field === "title";
    if (!naming && !draft.name?.trim()) {
      showToast(t("admin.contentDraft.needsName"), "error");
      return;
    }
    if (naming && !draft.name?.trim() && !draft.contextHints?.trim()) {
      showToast(t("admin.contentDraft.needsContext"), "error");
      return;
    }

    if (hasVisibleHtml(value)) {
      const ok = await confirm({
        title: t("admin.contentDraft.confirmReplaceTitle"),
        message: t("admin.contentDraft.confirmReplaceField"),
        confirmLabel: t("admin.contentDraft.replace"),
        cancelLabel: t("common.cancel"),
        confirmVariant: "primary",
      });
      if (!ok) return;
    }

    try {
      setBusy(true);
      const result = await requestContentDraft({
        kind: draft.kind,
        field: draft.field,
        siteId: draft.siteId,
        placeId: draft.placeId,
        lang: draft.lang,
        name: draft.name,
        contextHints: draft.contextHints,
        categoryId: draft.categoryId,
        townId: draft.townId,
        existingValue: value,
      });
      const text = (result.text || "").trim();
      if (!text) {
        showToast(t("admin.contentDraft.failed"), "error");
        return;
      }
      onApply(text);
      showToast(t("admin.contentDraft.applied"), "success");
    } catch (err) {
      showToast(draftErrorMessage(err, t), "error");
    } finally {
      setBusy(false);
    }
  };

  const title = !enabled
    ? t("admin.contentDraft.disabled")
    : busy
      ? t("admin.contentDraft.generating")
      : t("admin.contentDraft.postfixHint");

  const base: CSSProperties =
    variant === "toolbar"
      ? {
          minWidth: 32,
          height: 28,
          padding: "0 8px",
          borderRadius: 4,
          border: "1px solid #d1d5db",
          background: enabled ? "#f9fafb" : "#f3f4f6",
          color: enabled ? "#111827" : "#9ca3af",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.2,
          cursor: busy ? "wait" : enabled ? "pointer" : "not-allowed",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }
      : {
          position: "absolute",
          right: variant === "textarea" ? 8 : 6,
          top: variant === "textarea" ? 8 : "50%",
          transform: variant === "textarea" ? undefined : "translateY(-50%)",
          zIndex: 2,
          minWidth: 32,
          height: 28,
          padding: "0 8px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          background: enabled ? "#fff" : "#f3f4f6",
          color: enabled ? "#374151" : "#9ca3af",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.3,
          lineHeight: 1,
          cursor: busy ? "wait" : enabled ? "pointer" : "not-allowed",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        };

  return (
    <button
      type="button"
      className={`ai-postfix-btn ai-postfix-btn--${variant}`}
      onClick={() => void run()}
      disabled={busy || !enabled}
      title={title}
      aria-label={title}
      style={{ ...base, ...style }}
    >
      {busy ? "…" : "AI"}
    </button>
  );
}

type FieldWrapProps = {
  draft: AiDraftTarget;
  value: string;
  onApply: (text: string) => void;
  variant?: "input" | "textarea";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Wraps a plain input/textarea and mounts a compact AI postfix button. */
export function AiPostfixField({
  draft,
  value,
  onApply,
  variant = "input",
  children,
  className,
  style,
}: FieldWrapProps) {
  return (
    <div
      className={`ai-postfix-field ai-postfix-field--${variant}${className ? ` ${className}` : ""}`}
      style={{ position: "relative", ...style }}
    >
      {children}
      <AiGeneratePostfixButton
        draft={draft}
        value={value}
        onApply={onApply}
        variant={variant}
      />
    </div>
  );
}

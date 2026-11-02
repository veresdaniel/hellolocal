// src/components/AdminPageHeader.tsx
import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAdminBackPath } from "../utils/adminBackPath";
import { DEFAULT_LANG, isLang } from "../app/config";
import { useAdminPageChrome } from "../contexts/AdminPageChromeContext";
import { AdminBackButton } from "./AdminBackButton";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  newButtonLabel?: string;
  onNewClick?: () => void;
  showNewButton?: boolean;
  isCreatingOrEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  /**
   * When true (default), renders Vissza in the shared toolbar row.
   * Layout already hosts the toolbar; leave true so Back + actions stay one row.
   */
  showBackButton?: boolean;
  backTo?: string;
  /**
   * When true, Mégse also navigates (via backTo / getAdminBackPath) after onCancel.
   * Defaults to true on dedicated `/edit` routes; false on in-place list forms.
   */
  cancelNavigates?: boolean;
}

export function AdminPageHeader({
  title,
  subtitle,
  newButtonLabel,
  onNewClick,
  showNewButton = true,
  isCreatingOrEditing = false,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  showBackButton = true,
  backTo,
  cancelNavigates,
}: AdminPageHeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { toolbarMainEl, hasToolbarSlot } = useAdminPageChrome();

  const lang = isLang(langParam)
    ? langParam
    : isLang(i18n.language)
      ? i18n.language
      : DEFAULT_LANG;

  const isDedicatedEditRoute = /\/edit(?:\/|$)/.test(location.pathname);
  const shouldCancelNavigate = cancelNavigates ?? isDedicatedEditRoute;

  const handleCancel = () => {
    onCancel?.();
    if (shouldCancelNavigate) {
      window.setTimeout(() => {
        // Prefer explicit backTo / parent path for cancel (not history)
        const path =
          getAdminBackPath(location.pathname, lang, backTo) ?? `/${lang}/admin`;
        navigate(path);
      }, 0);
    }
  };

  const titleBlock = (
    <div className="admin-page-header__title" style={{ flex: 1, minWidth: 0 }}>
      <h1
        className="admin-page-title"
        style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          margin: 0,
          marginBottom: subtitle ? 8 : 0,
          display: typeof title === "string" ? "block" : "flex",
          justifyContent:
            typeof title === "string" ? "flex-start" : "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <div
          className="admin-page-muted"
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontWeight: 400,
            margin: 0,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );

  const actions = (
    <div
      className="admin-page-header__actions"
      style={{ display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 }}
    >
      {isCreatingOrEditing ? (
        <>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="admin-btn admin-btn--primary"
              style={{
                padding: "10px 20px",
                fontSize: "clamp(14px, 3.5vw, 16px)",
              }}
            >
              {saveLabel || t("common.update")}
            </button>
          )}
          {(onCancel || shouldCancelNavigate) && (
            <button
              type="button"
              onClick={handleCancel}
              className="admin-btn admin-btn--secondary"
              style={{
                padding: "10px 20px",
                fontSize: "clamp(14px, 3.5vw, 16px)",
              }}
            >
              {cancelLabel || t("common.cancel")}
            </button>
          )}
        </>
      ) : (
        showNewButton &&
        onNewClick && (
          <button
            type="button"
            onClick={onNewClick}
            className="admin-btn admin-btn--primary"
            style={{
              padding: "10px 20px",
              fontSize: "clamp(14px, 3.5vw, 16px)",
            }}
          >
            + {newButtonLabel || t("admin.forms.newItem")}
          </button>
        )
      )}
    </div>
  );

  /**
   * Prefer the layout toolbar slot so Vissza (layout) + title/actions share one row.
   * While the slot ref is attaching, render nothing (avoid a duplicate Back flash).
   * Fallback: self-contained row when outside AdminLayout.
   */
  if (hasToolbarSlot) {
    if (!toolbarMainEl) return null;
    return createPortal(
      <>
        {titleBlock}
        {actions}
      </>,
      toolbarMainEl,
    );
  }

  return (
    <div
      className="admin-page-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {showBackButton && <AdminBackButton backTo={backTo} />}
        {titleBlock}
      </div>
      {actions}
    </div>
  );
}

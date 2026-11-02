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
   * Fallback only (outside AdminLayout). Layout already owns Vissza in the toolbar.
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
  // Layout already renders a global AdminBackButton — keep page headers clean by default.
  showBackButton = false,
  backTo,
  cancelNavigates,
}: AdminPageHeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { toolbarActionsEl, hasToolbarSlot } = useAdminPageChrome();

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
        const path =
          getAdminBackPath(location.pathname, lang, backTo) ?? `/${lang}/admin`;
        navigate(path);
      }, 0);
    }
  };

  const titleBlock = (
    <div className="admin-page-header__title">
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
    <div className="admin-page-header__actions">
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
   * Layout owns [Vissza … actions] on one toolbar row.
   * Portal only actions into that row; title always renders below (never beside Back).
   */
  if (hasToolbarSlot) {
    return (
      <>
        {toolbarActionsEl ? createPortal(actions, toolbarActionsEl) : null}
        <div className="admin-page-header admin-page-header--below-toolbar">
          {titleBlock}
        </div>
      </>
    );
  }

  // Outside AdminLayout: self-contained header (Back + actions on one row, title below).
  return (
    <div className="admin-page-header">
      <div className="admin-page-toolbar admin-page-toolbar--local">
        {showBackButton && <AdminBackButton backTo={backTo} />}
        <div className="admin-page-toolbar__spacer" />
        {actions}
      </div>
      {titleBlock}
    </div>
  );
}

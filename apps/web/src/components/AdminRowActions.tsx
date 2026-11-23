import { useTranslation } from "react-i18next";

export type AdminStatusKind = "activate" | "deactivate";

type AdminRowActionsProps = {
  onView?: () => void;
  onAnalytics?: () => void;
  onStatus?: () => void;
  statusLabel?: string;
  /** activate = check (approve/publish), deactivate = pause (unpublish). */
  statusKind?: AdminStatusKind;
  onEdit?: () => void;
  onDelete?: () => void;
};

function IconView() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </svg>
  );
}

function IconActivate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5 11 15l4.5-5.5" />
    </svg>
  );
}

function IconDeactivate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function AdminRowActions({
  onView,
  onAnalytics,
  onStatus,
  statusLabel,
  statusKind = "activate",
  onEdit,
  onDelete,
}: AdminRowActionsProps) {
  const { t } = useTranslation();
  if (!onView && !onAnalytics && !onStatus && !onEdit && !onDelete) return null;

  const statusTitle =
    statusLabel ||
    (statusKind === "deactivate" ? t("admin.placeDeactivate") : t("admin.placeActivate"));

  return (
    <div className="admin-row-actions">
      {onView ? (
        <button type="button" className="admin-row-actions__btn" onClick={onView} title={t("admin.viewPublic")} aria-label={t("admin.viewPublic")}>
          <IconView />
        </button>
      ) : null}
      {onAnalytics ? (
        <button type="button" className="admin-row-actions__btn" onClick={onAnalytics} title={t("admin.analyticsLabel")} aria-label={t("admin.analyticsLabel")}>
          <IconAnalytics />
        </button>
      ) : null}
      {onStatus ? (
        <button
          type="button"
          className={
            statusKind === "deactivate"
              ? "admin-row-actions__btn admin-row-actions__btn--status-off"
              : "admin-row-actions__btn admin-row-actions__btn--status-on"
          }
          onClick={onStatus}
          title={statusTitle}
          aria-label={statusTitle}
        >
          {statusKind === "deactivate" ? <IconDeactivate /> : <IconActivate />}
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="admin-row-actions__btn" onClick={onEdit} title={t("common.edit")} aria-label={t("common.edit")}>
          <IconEdit />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="admin-row-actions__btn admin-row-actions__btn--danger" onClick={onDelete} title={t("common.delete")} aria-label={t("common.delete")}>
          <IconDelete />
        </button>
      ) : null}
    </div>
  );
}

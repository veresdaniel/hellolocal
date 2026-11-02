import { type ReactNode } from "react";
import { AdminDataTable } from "./AdminDataTable";
import "../styles/admin-filterable-list.css";

export type AdminFilterableListColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  /** Hide this column on the mobile card meta row (still available via renderCard). */
  hideOnCard?: boolean;
  getText?: (item: T) => string;
  sortable?: boolean;
  filterable?: boolean;
};

export type AdminFilterableListProps<T> = {
  /** Full filtered collection; the component slices the current page. */
  items: T[];
  getItemId: (item: T) => string;

  /** Domain-specific filter controls (place, category, search, …). */
  filters?: ReactNode;

  columns: AdminFilterableListColumn<T>[];
  /** Optional mobile card title; defaults to first column render. */
  cardTitle?: (item: T) => ReactNode;
  /** Optional extra body under the title on mobile cards. */
  cardSubtitle?: (item: T) => ReactNode;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  onRowClick?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: (item: T) => ReactNode;

  isLoading?: boolean;
  emptyMessage?: ReactNode;
  className?: string;
};

/**
 * Shared admin list shell: filters slot + responsive table/cards + pagination.
 * Filtering stays in the parent so places/events can plug in their own controls later.
 */
export function AdminFilterableList<T>({
  items,
  getItemId,
  filters,
  columns,
  cardTitle,
  cardSubtitle,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onDelete,
  actions,
  isLoading = false,
  emptyMessage,
  className,
}: AdminFilterableListProps<T>) {
  void page;
  void onPageChange;
  void onPageSizeChange;
  void cardTitle;
  void cardSubtitle;

  return (
    <div className={`admin-flist${className ? ` ${className}` : ""}`}>
      {filters ? <div className="admin-flist__filters">{filters}</div> : null}
      <AdminDataTable
        items={items}
        getItemId={getItemId}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        defaultPageSize={pageSize}
        stateKey="filterable"
        onEdit={onRowClick}
        onDelete={onDelete}
        actions={onRowClick || onDelete ? undefined : actions}
      />
    </div>
  );
}

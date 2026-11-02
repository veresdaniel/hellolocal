import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AdminRowActions } from "./AdminRowActions";
import { Pagination } from "./Pagination";
import { ADMIN_DEFAULT_PAGE_SIZE, filterAndSortRows } from "./adminTableModel";
import { useAdminListState } from "./useAdminListState";
import "../styles/admin-data-table.css";

export type AdminDataColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  /** Plain text for sort and the column filter. Falls back to rendered text. */
  getText?: (item: T) => string;
  sortable?: boolean;
  filterable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
};

export type AdminDataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export type AdminDataTableProps<T> = {
  items: T[];
  getItemId: (item: T) => string;
  columns: AdminDataColumn<T>[];
  actions?: (item: T) => ReactNode;
  onView?: (item: T) => void;
  onAnalytics?: (item: T) => void;
  onStatus?: (item: T) => void;
  statusLabel?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  showView?: (item: T) => boolean;
  actionsLabel?: string;
  isLoading?: boolean;
  emptyMessage?: ReactNode;
  className?: string;
  /**
   * When set, `items` is the current server page and is not sliced again.
   * Column filters and sort still apply to the loaded rows.
   */
  pagination?: AdminDataTablePagination;
  defaultPageSize?: number;
  /** Keeps filters, sort, page and page size in the URL and session storage. */
  stateKey?: string;
};

export function AdminDataTable<T>({
  items,
  getItemId,
  columns,
  actions,
  onView,
  onAnalytics,
  onStatus,
  statusLabel,
  onEdit,
  onDelete,
  showView,
  actionsLabel,
  isLoading = false,
  emptyMessage,
  className,
  pagination,
  defaultPageSize = ADMIN_DEFAULT_PAGE_SIZE,
  stateKey = "list",
}: AdminDataTableProps<T>) {
  const { t } = useTranslation();
  const [query, setQuery] = useAdminListState(stateKey);
  const { sort, filters } = query;
  const restoredServerPage = useRef(false);
  const ignoreStaleServerPage = useRef(false);
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  useEffect(() => {
    const current = paginationRef.current;
    if (!current) return;
    if (!restoredServerPage.current) {
      restoredServerPage.current = true;
      if (query.page !== current.page) {
        ignoreStaleServerPage.current = true;
        current.onPageChange(query.page);
      }
      if (query.pageSize !== current.pageSize) {
        ignoreStaleServerPage.current = true;
        current.onPageSizeChange(query.pageSize);
      }
      return;
    }
    if (ignoreStaleServerPage.current) {
      ignoreStaleServerPage.current = false;
      return;
    }
    setQuery((prev) =>
      prev.page === current.page && prev.pageSize === current.pageSize
        ? prev
        : { ...prev, page: current.page, pageSize: current.pageSize }
    );
  }, [pagination?.page, pagination?.pageSize, query.page, query.pageSize, setQuery]);

  const prepared = useMemo(
    () => filterAndSortRows(items, columns, filters, sort),
    [items, columns, filters, sort]
  );

  const page = pagination ? pagination.page : query.page;
  const pageSize = pagination ? pagination.pageSize : query.pageSize || defaultPageSize;
  const setPage = (next: number) => {
    if (pagination) pagination.onPageChange(next);
    else setQuery((prev) => ({ ...prev, page: next }));
  };
  const setPageSize = (next: number) => {
    if (pagination) pagination.onPageSizeChange(next);
    else setQuery((prev) => ({ ...prev, pageSize: next, page: 1 }));
  };

  const clientTotal = prepared.length;
  const clientTotalPages = Math.max(1, Math.ceil(clientTotal / Math.max(1, pageSize)) || 1);
  const safePage = Math.min(Math.max(1, page), clientTotalPages);

  useEffect(() => {
    if (!pagination && page !== safePage) setPage(safePage);
  }, [pagination, page, safePage]);

  const pageItems = pagination
    ? prepared
    : prepared.slice((safePage - 1) * pageSize, safePage * pageSize);

  const footerPage = pagination?.page ?? safePage;
  const footerSize = pagination?.pageSize ?? pageSize;
  const footerTotal = pagination?.total ?? clientTotal;
  const footerPages = pagination
    ? Math.max(1, Math.ceil(footerTotal / Math.max(1, footerSize)) || 1)
    : clientTotalPages;
  const hasActions = Boolean(actions || onView || onAnalytics || onStatus || onEdit || onDelete);

  const toggleSort = (key: string) => {
    setQuery((current) => {
      const active = current.sort;
      const sort =
        !active || active.key !== key
          ? { key, dir: "asc" as const }
          : active.dir === "asc"
            ? { key, dir: "desc" as const }
            : null;
      return { ...current, sort, page: pagination ? current.page : 1 };
    });
    if (pagination) setPage(1);
  };

  const setFilter = (key: string, value: string) => {
    setQuery((current) => ({
      ...current,
      filters: { ...current.filters, [key]: value },
      page: pagination ? current.page : 1,
    }));
    if (pagination) setPage(1);
  };

  return (
    <div className={`admin-data-table${className ? ` ${className}` : ""}`}>
      <div className="admin-data-table__wrap">
        <table className="admin-data-table__table">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    style={{ textAlign: column.align || "left", width: column.width }}
                    aria-sort={
                      active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={`admin-data-table__sort${active ? " is-active" : ""}`}
                        onClick={() => toggleSort(column.key)}
                      >
                        <span>{column.label}</span>
                        <span className="admin-data-table__sort-mark" aria-hidden="true">
                          {active ? (sort?.dir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      <span className="admin-data-table__label">{column.label}</span>
                    )}
                  </th>
                );
              })}
              {hasActions ? (
                <th className="admin-data-table__actions">
                  <span className="admin-data-table__label">
                    {actionsLabel || t("admin.table.actions")}
                  </span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            <tr className="admin-data-table__filters">
              {columns.map((column) => (
                <td key={`${column.key}-filter`} style={{ textAlign: column.align || "left" }}>
                  {column.filterable === false ? null : (
                    <input
                      type="search"
                      value={filters[column.key] || ""}
                      aria-label={t("admin.table.filterColumn", { column: column.label })}
                      placeholder={t("admin.table.filterPlaceholder")}
                      onChange={(event) => setFilter(column.key, event.target.value)}
                    />
                  )}
                </td>
              ))}
              {hasActions ? <td className="admin-data-table__actions" /> : null}
            </tr>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="admin-data-table__empty">
                  {t("common.loading")}…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="admin-data-table__empty">
                  {emptyMessage || t("admin.table.noData")}
                </td>
              </tr>
            ) : (
              pageItems.map((item) => {
                const id = getItemId(item);
                return (
                  <tr key={id}>
                    {columns.map((column) => (
                      <td key={column.key} style={{ textAlign: column.align || "left" }}>
                        {column.render(item)}
                      </td>
                    ))}
                    {hasActions ? (
                      <td className="admin-data-table__actions">
                        {onView || onAnalytics || onStatus || onEdit || onDelete ? (
                          <AdminRowActions
                            onView={
                              onView && (!showView || showView(item))
                                ? () => onView(item)
                                : undefined
                            }
                            onAnalytics={onAnalytics ? () => onAnalytics(item) : undefined}
                            onStatus={onStatus ? () => onStatus(item) : undefined}
                            statusLabel={statusLabel}
                            onEdit={onEdit ? () => onEdit(item) : undefined}
                            onDelete={onDelete ? () => onDelete(item) : undefined}
                          />
                        ) : (
                          actions?.(item)
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={footerPage}
        totalPages={footerPages}
        total={footerTotal}
        limit={footerSize}
        onPageChange={pagination ? pagination.onPageChange : setPage}
        onLimitChange={setPageSize}
      />
    </div>
  );
}

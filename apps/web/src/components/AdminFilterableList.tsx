import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pagination } from "./Pagination";
import { LoadingSpinner } from "./LoadingSpinner";
import { BREAKPOINTS } from "../utils/viewport";
import "../styles/admin-filterable-list.css";

export type AdminFilterableListColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  /** Hide this column on the mobile card meta row (still available via renderCard). */
  hideOnCard?: boolean;
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
  actions,
  isLoading = false,
  emptyMessage,
  className,
}: AdminFilterableListProps<T>) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < BREAKPOINTS.tablet;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  if (isLoading) {
    return (
      <div className={`admin-flist${className ? ` ${className}` : ""}`}>
        {filters ? <div className="admin-flist__filters">{filters}</div> : null}
        <LoadingSpinner isLoading />
      </div>
    );
  }

  return (
    <div className={`admin-flist${className ? ` ${className}` : ""}`}>
      {filters ? <div className="admin-flist__filters">{filters}</div> : null}

      {total === 0 ? (
        <p className="admin-flist__empty">
          {emptyMessage ?? t("admin.list.noResults")}
        </p>
      ) : (
        <>
          <p className="admin-flist__count" aria-live="polite">
            {t("admin.list.results", { count: total })}
          </p>

          {isMobile ? (
            <ul className="admin-flist__cards">
              {pageItems.map((item) => {
                const id = getItemId(item);
                const title =
                  cardTitle?.(item) ??
                  columns[0]?.render(item) ??
                  id;
                return (
                  <li key={id} className="admin-flist__card">
                    <button
                      type="button"
                      className="admin-flist__card-main"
                      onClick={() => onRowClick?.(item)}
                      disabled={!onRowClick}
                    >
                      <strong className="admin-flist__card-title">{title}</strong>
                      {cardSubtitle ? (
                        <span className="admin-flist__card-sub">{cardSubtitle(item)}</span>
                      ) : (
                        <span className="admin-flist__card-sub">
                          {columns
                            .slice(1)
                            .filter((col) => !col.hideOnCard)
                            .map((col) => (
                              <span key={col.key} className="admin-flist__card-meta">
                                {col.render(item)}
                              </span>
                            ))}
                        </span>
                      )}
                    </button>
                    {actions ? (
                      <div className="admin-flist__card-actions">{actions(item)}</div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="admin-flist__table-wrap">
              <table className="admin-flist__table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: col.align || "left",
                          width: col.width,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                    {actions ? (
                      <th className="admin-flist__actions-col">{t("common.actions")}</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const id = getItemId(item);
                    return (
                      <tr
                        key={id}
                        className={onRowClick ? "is-clickable" : undefined}
                        onClick={() => onRowClick?.(item)}
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            style={{ textAlign: col.align || "left" }}
                          >
                            {col.render(item)}
                          </td>
                        ))}
                        {actions ? (
                          <td
                            className="admin-flist__actions-col"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {actions(item)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {onPageSizeChange || totalPages > 1 ? (
            <div className="admin-flist__pagination">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                total={total}
                limit={pageSize}
                onPageChange={onPageChange}
                onLimitChange={onPageSizeChange ?? (() => undefined)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

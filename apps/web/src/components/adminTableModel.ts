import { isValidElement, type ReactNode } from "react";

export const ADMIN_PAGE_SIZES = [5, 10, 20, 50] as const;
export const ADMIN_DEFAULT_PAGE_SIZE = 10;

export type SortDirection = "asc" | "desc";

export type AdminSortState = {
  key: string;
  dir: SortDirection;
};

export type AdminColumnText<T> = {
  key: string;
  getText?: (item: T) => string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
};

export function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node
      .map((child) => reactNodeToText(child))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return reactNodeToText(props.children);
  }
  return "";
}

export function columnText<T>(item: T, column: AdminColumnText<T>): string {
  if (column.getText) return column.getText(item);
  if (column.render) return reactNodeToText(column.render(item));
  return "";
}

export function filterAndSortRows<T>(
  items: T[],
  columns: AdminColumnText<T>[],
  filters: Record<string, string>,
  sort: AdminSortState | null
): T[] {
  let rows = items;
  for (const column of columns) {
    if (column.filterable === false) continue;
    const query = (filters[column.key] || "").trim().toLowerCase();
    if (!query) continue;
    rows = rows.filter((item) => columnText(item, column).toLowerCase().includes(query));
  }

  if (!sort) return rows;
  const column = columns.find((item) => item.key === sort.key);
  if (!column || column.sortable === false) return rows;

  const sorted = [...rows];
  sorted.sort((left, right) => {
    const cmp = columnText(left, column).localeCompare(columnText(right, column), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

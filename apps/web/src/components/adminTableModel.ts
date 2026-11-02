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

function columnMatchesFilter<T>(
  item: T,
  column: AdminColumnText<T>,
  filters: Record<string, string>
): boolean {
  if (column.filterable === false) return true;
  const query = (filters[column.key] || "").trim().toLowerCase();
  if (!query) return true;
  return columnText(item, column).toLowerCase().includes(query);
}

/** Unique display values of one column, given every other active column filter. */
export function columnFilterOptions<T>(
  items: T[],
  columns: AdminColumnText<T>[],
  filters: Record<string, string>,
  columnKey: string
): string[] {
  const column = columns.find((item) => item.key === columnKey);
  if (!column || column.filterable === false) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of items) {
    const matchesOthers = columns.every(
      (other) => other.key === columnKey || columnMatchesFilter(item, other, filters)
    );
    if (!matchesOthers) continue;
    const text = columnText(item, column).replace(/\s+/g, " ").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    values.push(text);
  }
  values.sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
  );
  return values;
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

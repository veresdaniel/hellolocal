import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  ADMIN_PAGE_SIZES,
  type AdminSortState,
} from "./adminTableModel";

export type AdminListQueryState = {
  page: number;
  pageSize: number;
  sort: AdminSortState | null;
  filters: Record<string, string>;
};

const PAGE_SIZES = new Set<number>(ADMIN_PAGE_SIZES);

function prefixFor(stateKey: string) {
  return stateKey === "list" ? "al" : `al_${stateKey}`;
}

function emptyState(): AdminListQueryState {
  return { page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, sort: null, filters: {} };
}

function normalize(value: Partial<AdminListQueryState> | null | undefined): AdminListQueryState {
  const pageSize = Number(value?.pageSize);
  const dir = value?.sort?.dir === "desc" ? "desc" : "asc";
  return {
    page: Math.max(1, Number(value?.page) || 1),
    pageSize: PAGE_SIZES.has(pageSize) ? pageSize : ADMIN_DEFAULT_PAGE_SIZE,
    sort: value?.sort?.key ? { key: value.sort.key, dir } : null,
    filters:
      value?.filters && typeof value.filters === "object"
        ? Object.fromEntries(
            Object.entries(value.filters).filter((entry): entry is [string, string] => {
              return typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].trim() !== "";
            })
          )
        : {},
  };
}

function readFromParams(params: URLSearchParams, prefix: string): AdminListQueryState | null {
  const filterPrefix = `${prefix}_f_`;
  const filters: Record<string, string> = {};
  let has = false;
  params.forEach((value, key) => {
    if (key.startsWith(filterPrefix)) {
      has = true;
      if (value) filters[key.slice(filterPrefix.length)] = value;
    }
  });
  if (
    params.has(`${prefix}_page`) ||
    params.has(`${prefix}_size`) ||
    params.has(`${prefix}_sort`)
  ) {
    has = true;
  }
  if (!has) return null;
  const dir = params.get(`${prefix}_dir`) === "desc" ? "desc" : "asc";
  const sortName = params.get(`${prefix}_sort`) || "";
  return normalize({
    page: Number(params.get(`${prefix}_page`) || "1"),
    pageSize: Number(params.get(`${prefix}_size`) || String(ADMIN_DEFAULT_PAGE_SIZE)),
    sort: sortName ? { key: sortName, dir } : null,
    filters,
  });
}

function readStorage(key: string): AdminListQueryState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return normalize(JSON.parse(raw) as AdminListQueryState);
  } catch {
    return null;
  }
}

export function useAdminListState(stateKey = "list") {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = prefixFor(stateKey);
  const storageKey = `admin-list:${location.pathname}:${stateKey}`;

  const [state, setState] = useState<AdminListQueryState>(
    () => readFromParams(searchParams, prefix) || readStorage(storageKey) || emptyState()
  );

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
    const next = new URLSearchParams(searchParams);
    const owned: string[] = [];
    next.forEach((_, key) => {
      if (
        key === `${prefix}_page` ||
        key === `${prefix}_size` ||
        key === `${prefix}_sort` ||
        key === `${prefix}_dir` ||
        key.startsWith(`${prefix}_f_`)
      ) {
        owned.push(key);
      }
    });
    owned.forEach((key) => next.delete(key));
    if (state.page > 1) next.set(`${prefix}_page`, String(state.page));
    if (state.pageSize !== ADMIN_DEFAULT_PAGE_SIZE) {
      next.set(`${prefix}_size`, String(state.pageSize));
    }
    if (state.sort) {
      next.set(`${prefix}_sort`, state.sort.key);
      next.set(`${prefix}_dir`, state.sort.dir);
    }
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value.trim()) next.set(`${prefix}_f_${key}`, value);
    });
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [state, prefix, storageKey, searchParams, setSearchParams]);

  return [state, setState] as const;
}

export function adminReturnState(pathname: string, search: string) {
  return { adminReturn: `${pathname}${search}` };
}

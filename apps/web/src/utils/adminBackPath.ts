/**
 * Shared admin "Vissza" routing: nested → parent list; otherwise history
 * with dashboard fallback. Returns null on the dashboard (no back).
 */

export function isAdminDashboardPath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return /(?:^|\/)admin$/.test(path);
}

/**
 * Resolve the sensible parent path for an admin screen.
 * @returns null when already on the dashboard (caller should hide Back).
 */
export function getAdminBackPath(
  pathname: string,
  lang: string,
  backTo?: string
): string | null {
  if (backTo) {
    return backTo;
  }

  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const langPrefix = `/${lang}`;
  const dashboard = `${langPrefix}/admin`;

  if (isAdminDashboardPath(path)) {
    return null;
  }

  // Nested / dedicated edit → parent list (or related hub)
  const nestedParents: Array<[RegExp, string]> = [
    [/\/admin\/places\/[^/]+\/(?:analytics|pricelist)$/, `${langPrefix}/admin/places`],
    [/\/admin\/towns\/[^/]+\/analytics$/, `${langPrefix}/admin/towns`],
    [/\/admin\/events\/[^/]+\/analytics$/, `${langPrefix}/admin/events`],
    [/\/admin\/sites\/[^/]+\/edit$/, `${langPrefix}/admin/sites`],
    [/\/admin\/regions\/[^/]+\/edit$/, `${langPrefix}/admin/sites`],
    [/\/admin\/collections\/(?:new|[^/]+\/edit)$/, `${langPrefix}/admin/collections`],
    [/\/admin\/analytics\/(?:site|region)$/, dashboard],
    [/\/admin\/ui-copy$/, `${langPrefix}/admin/i18n`],
  ];

  for (const [pattern, parent] of nestedParents) {
    if (pattern.test(path)) {
      return parent;
    }
  }

  // Creating/editing under a list segment: /admin/sites → dashboard already covered;
  // remaining top-level admin screens → dashboard
  if (/\/admin\//.test(path)) {
    return dashboard;
  }

  return dashboard;
}

/** True when React Router has a prior in-app history entry. */
export function canUseAdminHistoryBack(): boolean {
  if (typeof window === "undefined") return false;
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === "number" && state.idx > 0;
}

/**
 * Nested screens always go to their parent list.
 * Top-level screens prefer history, then dashboard.
 */
export function resolveAdminBackNavigation(
  pathname: string,
  lang: string,
  backTo?: string
): { type: "path"; to: string } | { type: "history" } | { type: "none" } {
  const target = getAdminBackPath(pathname, lang, backTo);
  if (target === null) {
    return { type: "none" };
  }

  const dashboard = `/${lang}/admin`;
  const isHierarchicalParent = Boolean(backTo) || target !== dashboard;

  if (isHierarchicalParent) {
    return { type: "path", to: target };
  }

  if (canUseAdminHistoryBack()) {
    return { type: "history" };
  }

  return { type: "path", to: target };
}

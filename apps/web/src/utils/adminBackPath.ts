/**
 * Resolve a sensible "Vissza" target for admin routes.
 * Nested edit/analytics → parent list; top-level screens → dashboard.
 */
export function getAdminBackPath(pathname: string, lang?: string): string | null {
  const langPrefix = lang ? `/${lang}` : "";
  const adminRoot = `${langPrefix}/admin`;

  // Exact dashboard — no back
  if (
    pathname === adminRoot ||
    pathname === `${adminRoot}/` ||
    pathname.match(new RegExp(`^${adminRoot.replace(/\//g, "\\/")}/?$`))
  ) {
    return null;
  }

  // Site edit
  if (pathname.includes("/admin/sites/") && pathname.includes("/edit")) {
    return `${adminRoot}/sites`;
  }

  // Collection edit / new
  if (pathname.match(/\/admin\/collections\/[^/]+/)) {
    return `${adminRoot}/collections`;
  }

  // Nested analytics / pricelist under an entity
  const nested = pathname.match(
    /\/admin\/(places|events|towns|sites)\/[^/]+\/(analytics|pricelist|price-list)/
  );
  if (nested) {
    return `${adminRoot}/${nested[1]}`;
  }

  // Entity detail-ish paths with id segments beyond the list
  const withId = pathname.match(/\/admin\/(places|events|towns|sites|users)\/[^/]+/);
  if (withId) {
    return `${adminRoot}/${withId[1]}`;
  }

  // ui-copy lives under i18n hub
  if (pathname.includes("/admin/ui-copy")) {
    return `${adminRoot}/i18n`;
  }

  // Everything else under admin → dashboard
  if (pathname.includes("/admin")) {
    return adminRoot;
  }

  return adminRoot;
}

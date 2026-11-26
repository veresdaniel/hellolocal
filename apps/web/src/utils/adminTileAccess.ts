export type TileScope = {
  unrestricted: boolean;
  siteIds: string[];
  regionEditorSiteIds: string[];
  regionAdminSiteIds: string[];
  townIds: string[];
  placeIds: string[];
};

/** Content-section dashboard tiles (daily editorial work). */
export type ContentTileId =
  | "mobileWizard"
  | "newContent"
  | "towns"
  | "places"
  | "events"
  | "collections"
  | "access"
  | "eventLog"
  | "siteStatus";

export type ScopeGate = "towns" | "ownTowns" | "places" | "events" | "regionEditor" | "regionAdmin";

export function scopeAllows(
  gate: ScopeGate,
  role: string | null,
  scope: TileScope | null
): boolean {
  if (role === "superadmin" || scope?.unrestricted) return true;
  if (!scope) return false;
  if (gate === "ownTowns") return scope.townIds.length > 0;
  if (gate === "towns") {
    return scope.regionEditorSiteIds.length > 0 || scope.townIds.length > 0;
  }
  if (gate === "places" || gate === "events") {
    return (
      scope.regionEditorSiteIds.length > 0 ||
      scope.townIds.length > 0 ||
      scope.placeIds.length > 0
    );
  }
  if (gate === "regionEditor") return scope.regionEditorSiteIds.length > 0;
  return scope.regionAdminSiteIds.length > 0;
}

/**
 * Content hub tiles. Categories live under Platform (superadmin only), not here.
 * Order: mobileWizard (narrow only) → newContent → places → events → collections → …
 * Desktop keeps classic Places/Events create; wizard is mobile entry only.
 */
export function visibleContentTiles(
  role: string | null,
  scope: TileScope | null,
  opts?: { isMobile?: boolean }
): ContentTileId[] {
  const showWizard = opts?.isMobile === true;
  if (role === "superadmin" || scope?.unrestricted) {
    return [
      ...(showWizard ? (["mobileWizard"] as const) : []),
      "newContent",
      "places",
      "events",
      "collections",
    ];
  }
  if (!scope) return [];
  const regionEditor = scope.regionEditorSiteIds.length > 0;
  const townAdmin = scope.townIds.length > 0 && !regionEditor;
  const placeAdmin = scope.placeIds.length > 0 && !regionEditor && scope.townIds.length === 0;
  const canEditorial = regionEditor || townAdmin || placeAdmin;
  const tiles: ContentTileId[] = [];
  if (townAdmin) tiles.push("towns");
  if (canEditorial) {
    if (showWizard) tiles.push("mobileWizard");
    tiles.push("newContent", "places", "events");
  }
  if (regionEditor || townAdmin || placeAdmin) tiles.push("eventLog");
  return tiles;
}

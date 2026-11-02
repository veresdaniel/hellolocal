export type TileScope = {
  unrestricted: boolean;
  siteIds: string[];
  regionEditorSiteIds: string[];
  regionAdminSiteIds: string[];
  townIds: string[];
  placeIds: string[];
};

export type ContentTileId =
  | "towns"
  | "places"
  | "access"
  | "categories"
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

export function visibleContentTiles(role: string | null, scope: TileScope | null): ContentTileId[] {
  if (role === "superadmin" || scope?.unrestricted) {
    return ["places", "categories"];
  }
  if (!scope) return [];
  const regionEditor = scope.regionEditorSiteIds.length > 0;
  const townAdmin = scope.townIds.length > 0 && !regionEditor;
  const placeAdmin = scope.placeIds.length > 0 && !regionEditor && scope.townIds.length === 0;
  const tiles: ContentTileId[] = [];
  if (townAdmin) tiles.push("towns");
  if (regionEditor || placeAdmin) tiles.push("places");
  if (regionEditor) tiles.push("categories");
  if (regionEditor || townAdmin || placeAdmin) tiles.push("eventLog");
  return tiles;
}

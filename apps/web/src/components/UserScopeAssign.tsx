import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createAccessGrant,
  deleteAccessGrant,
  getAccessGrants,
  getPlaces,
  getTowns,
  type AccessGrant,
  type Site,
} from "../api/admin.api";

function labelOf(translations: Array<{ lang: string; name: string }> | undefined, fallback: string) {
  return translations?.find((row) => row.lang === "hu")?.name || translations?.[0]?.name || fallback;
}

/** Assign town-admin and place-admin scope without changing the user's region role. */
export function UserScopeAssign({ userId, sites }: { userId: string; sites: Site[] }) {
  const { t } = useTranslation();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [towns, setTowns] = useState<Array<{ id: string; translations?: Array<{ lang: string; name: string }> }>>([]);
  const [places, setPlaces] = useState<Array<{ id: string; translations?: Array<{ lang: string; name: string }> }>>([]);
  const [townId, setTownId] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id || "");
  const [placeId, setPlaceId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [grantRows, townRows] = await Promise.all([getAccessGrants(), getTowns(undefined, 1, 500)]);
    setGrants(grantRows.filter((row) => row.user.id === userId));
    setTowns(Array.isArray(townRows) ? townRows : townRows?.towns || []);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [userId]);

  useEffect(() => {
    if (!siteId) {
      setPlaces([]);
      return;
    }
    void getPlaces(siteId, 1, 200)
      .then((rows) => setPlaces(Array.isArray(rows) ? rows : rows?.places || []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [siteId]);

  const mine = (kind: "town" | "place") => grants.filter((row) => row.kind === kind);

  const add = async (kind: "town" | "place", targetId: string) => {
    if (!targetId) return;
    setError("");
    try {
      await createAccessGrant({
        userId,
        kind,
        targetId,
        role: kind === "place" ? "manager" : "editor",
      });
      setTownId("");
      setPlaceId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (kind: "town" | "place", id: string) => {
    setError("");
    try {
      await deleteAccessGrant(kind, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="admin-section-card" style={{ marginBottom: 16 }}>
      <h3 className="admin-section-card__title">{t("admin.usersPage.scopeTitle")}</h3>
      <p className="admin-section-card__help">{t("admin.usersPage.scopeHint")}</p>
      {error ? <p style={{ color: "#991b1b" }}>{error}</p> : null}
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            {t("admin.roles.townAdmin")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={townId} onChange={(event) => setTownId(event.target.value)} style={{ flex: 1, minHeight: 40 }}>
              <option value="">{t("admin.selectTown")}</option>
              {towns.map((town) => (
                <option key={town.id} value={town.id}>
                  {labelOf(town.translations, town.id)}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn--primary" disabled={!townId} onClick={() => void add("town", townId)}>
              {t("admin.townMembers.add")}
            </button>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {mine("town").map((row) => (
              <li key={row.id}>
                {row.targetName}{" "}
                <button type="button" onClick={() => void remove("town", row.id)}>
                  {t("common.delete")}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            {t("admin.roles.placeAdmin")}
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={siteId} onChange={(event) => setSiteId(event.target.value)} style={{ minHeight: 40 }}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.slug}
                </option>
              ))}
            </select>
            <select value={placeId} onChange={(event) => setPlaceId(event.target.value)} style={{ flex: 1, minHeight: 40 }}>
              <option value="">{t("admin.selectPlace")}</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {labelOf(place.translations, place.id)}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn--primary" disabled={!placeId} onClick={() => void add("place", placeId)}>
              {t("admin.townMembers.add")}
            </button>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {mine("place").map((row) => (
              <li key={row.id}>
                {row.targetName}{" "}
                <button type="button" onClick={() => void remove("place", row.id)}>
                  {t("common.delete")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

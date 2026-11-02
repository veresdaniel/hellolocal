import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable } from "./AdminDataTable";
import { AdminRoleSelect } from "./AdminRoleSelect";
import {
  createAccessGrant,
  deleteAccessGrant,
  getAccessGrants,
  getPlaces,
  getSites,
  getTowns,
  getUsers,
  type AccessGrant,
  type AccessKind,
} from "../api/admin.api";

type Target = { id: string; name: string };

export function UserAccessPanel() {
  const { t } = useTranslation();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [regions, setRegions] = useState<Target[]>([]);
  const [towns, setTowns] = useState<Target[]>([]);
  const [places, setPlaces] = useState<Target[]>([]);
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<AccessKind>("place");
  const [targetId, setTargetId] = useState("");
  const [role, setRole] = useState("editor");
  const [error, setError] = useState("");

  const load = async () => {
    const [grantRows, userRows, siteRows] = await Promise.all([
      getAccessGrants(),
      getUsers(),
      getSites(),
    ]);
    setGrants(grantRows);
    setUsers(userRows);
    setRegions(
      (siteRows || []).map((site) => ({
        id: site.id,
        name: site.translations?.find((row) => row.lang === "hu")?.name || site.slug,
      }))
    );
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    const siteId = regions[0]?.id;
    if (!siteId) return;
    void Promise.all([getTowns(siteId, 1, 200), getPlaces(siteId, 1, 200)]).then(
      ([townRes, placeRes]) => {
        const townList = Array.isArray(townRes) ? townRes : townRes.towns || [];
        const placeList = Array.isArray(placeRes) ? placeRes : placeRes.places || [];
        setTowns(
          townList.map((town: { id: string; translations?: Array<{ lang: string; name: string }> }) => ({
            id: town.id,
            name: town.translations?.find((row) => row.lang === "hu")?.name || town.id,
          }))
        );
        setPlaces(
          placeList.map((place: { id: string; translations?: Array<{ lang: string; name: string }> }) => ({
            id: place.id,
            name: place.translations?.find((row) => row.lang === "hu")?.name || place.id,
          }))
        );
      }
    );
  }, [regions]);

  const targets = kind === "region" ? regions : kind === "town" ? towns : places;
  const roleOptions =
    kind === "region"
      ? [
          { value: "siteadmin", label: t("admin.roles.siteadmin") },
          { value: "editor", label: t("admin.roles.editor") },
        ]
      : kind === "place"
        ? [
            { value: "editor", label: t("admin.roles.editor") },
            { value: "manager", label: t("admin.roles.manager") },
            { value: "owner", label: t("admin.roles.owner") },
          ]
        : [{ value: "editor", label: t("admin.access.townEditor") }];

  const addGrant = async () => {
    setError("");
    try {
      await createAccessGrant({ userId, kind, targetId, role });
      setTargetId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{t("admin.access.title")}</h2>
      <p style={{ margin: "0 0 16px", color: "#475569" }}>{t("admin.access.hint")}</p>
      {error ? (
        <p role="alert" style={{ color: "#991b1b" }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} style={{ minHeight: 40 }}>
          <option value="">{t("admin.access.user")}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as AccessKind);
            setTargetId("");
            setRole(event.target.value === "region" ? "editor" : "editor");
          }}
          style={{ minHeight: 40 }}
        >
          <option value="region">{t("admin.access.region")}</option>
          <option value="town">{t("admin.access.town")}</option>
          <option value="place">{t("admin.access.place")}</option>
        </select>
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)} style={{ minHeight: 40 }}>
          <option value="">{t("admin.access.target")}</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name}
            </option>
          ))}
        </select>
        <AdminRoleSelect value={role} onChange={setRole} options={roleOptions} />
        <button type="button" className="admin-btn admin-btn--primary" disabled={!userId || !targetId} onClick={() => void addGrant()}>
          {t("admin.access.add")}
        </button>
      </div>
      <AdminDataTable
        items={grants}
        getItemId={(row) => `${row.kind}-${row.id}`}
        stateKey="access"
        emptyMessage={t("admin.access.empty")}
        columns={[
          {
            key: "user",
            label: t("admin.access.user"),
            getText: (row) => `${row.user.firstName} ${row.user.lastName} ${row.user.email}`,
            render: (row) => `${row.user.firstName} ${row.user.lastName}`,
          },
          {
            key: "kind",
            label: t("admin.access.scope"),
            getText: (row) => t(`admin.access.${row.kind}`),
            render: (row) => t(`admin.access.${row.kind}`),
          },
          {
            key: "target",
            label: t("admin.access.target"),
            getText: (row) => row.targetName,
            render: (row) => row.targetName,
          },
          {
            key: "role",
            label: t("admin.role"),
            getText: (row) => row.role,
            render: (row) => (
              <span className="admin-role-badge" data-role={row.role === "siteadmin" ? "admin" : row.role}>
                {t(`admin.roles.${row.role}`, { defaultValue: row.role })}
              </span>
            ),
          },
        ]}
        onDelete={(row) => {
          if (!confirm(t("admin.access.removeConfirm"))) return;
          void deleteAccessGrant(row.kind, row.id).then(() => load());
        }}
      />
    </section>
  );
}

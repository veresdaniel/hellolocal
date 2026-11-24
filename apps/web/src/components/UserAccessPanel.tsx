import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable } from "./AdminDataTable";
import { AdminRoleSelect } from "./AdminRoleSelect";
import { AdminAutocomplete } from "./AdminAutocomplete";
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
        <AdminAutocomplete
          value={userId}
          options={users.map((user) => ({
            value: user.id,
            label: `${user.firstName} ${user.lastName} (${user.email})`,
          }))}
          clearOptionLabel={t("admin.access.user")}
          placeholder={t("admin.access.user")}
          onChange={setUserId}
          fullWidth={false}
          style={{ minWidth: 220, flex: 1 }}
          inputStyle={{ minHeight: 40, padding: "8px 12px" }}
        />
        <AdminAutocomplete
          value={kind}
          options={[
            { value: "region", label: t("admin.access.region") },
            { value: "town", label: t("admin.access.town") },
            { value: "place", label: t("admin.access.place") },
          ]}
          onChange={(next) => {
            setKind(next as AccessKind);
            setTargetId("");
            setRole("editor");
          }}
          fullWidth={false}
          style={{ minWidth: 140 }}
          inputStyle={{ minHeight: 40, padding: "8px 12px" }}
        />
        <AdminAutocomplete
          value={targetId}
          options={targets.map((target) => ({ value: target.id, label: target.name }))}
          clearOptionLabel={t("admin.access.target")}
          placeholder={t("admin.access.target")}
          onChange={setTargetId}
          fullWidth={false}
          style={{ minWidth: 180, flex: 1 }}
          inputStyle={{ minHeight: 40, padding: "8px 12px" }}
        />
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

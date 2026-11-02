import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable } from "./AdminDataTable";
import { AdminRoleSelect } from "./AdminRoleSelect";
import {
  deletePlaceMembership,
  getPlaceMemberships,
  invitePlaceMember,
  updatePlaceMembership,
  type PlaceMembership,
} from "../api/admin.api";

type PlaceRole = "owner" | "manager" | "editor";

export function PlaceMembersPanel({
  placeId,
  canManage,
}: {
  placeId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<PlaceMembership[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlaceRole>("editor");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const rows = await getPlaceMemberships(placeId);
    setMembers(rows.filter((row) => row.placeId === placeId));
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId, canManage]);

  const roleLabel = (value: string) =>
    value === "editor" ? t("admin.roles.placeEditor") : t(`admin.roles.${value}`, { defaultValue: value });

  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ margin: "0 0 8px" }}>{t("admin.placeMembers.title")}</h3>
      <p style={{ margin: "0 0 12px", color: "#475569" }}>{t("admin.placeMembers.hint")}</p>
      {error ? <p style={{ color: "#991b1b" }}>{error}</p> : null}
      {notice ? <p style={{ color: "#166534" }}>{notice}</p> : null}
      {canManage ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <input
            type="email"
            value={email}
            placeholder={t("admin.placeMembers.emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
            style={{ minHeight: 40, minWidth: 240, padding: "8px 12px" }}
          />
          <AdminRoleSelect
            value={role}
            onChange={(value) => setRole(value as PlaceRole)}
            options={[
              { value: "editor", label: t("admin.roles.placeEditor") },
              { value: "manager", label: t("admin.roles.manager") },
              { value: "owner", label: t("admin.roles.owner") },
            ]}
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={!email.includes("@")}
            onClick={() => {
              setError("");
              setNotice("");
              void invitePlaceMember(placeId, email.trim(), role)
                .then((result) => {
                  setEmail("");
                  setNotice(
                    result.emailed ? t("admin.placeMembers.mailSent") : t("admin.placeMembers.mailNotSent")
                  );
                  return load();
                })
                .catch((err) => setError(err instanceof Error ? err.message : String(err)));
            }}
          >
            {t("admin.placeMembers.add")}
          </button>
        </div>
      ) : null}
      <AdminDataTable
        items={members}
        getItemId={(row) => row.id}
        stateKey={`place-members-${placeId}`}
        emptyMessage={t("admin.placeMembers.empty")}
        columns={[
          {
            key: "user",
            label: t("admin.user"),
            getText: (row) =>
              row.user ? `${row.user.firstName} ${row.user.lastName} ${row.user.email}` : row.userId,
            render: (row) =>
              row.user ? `${row.user.firstName} ${row.user.lastName} (${row.user.email})` : row.userId,
          },
          {
            key: "role",
            label: t("admin.role"),
            getText: (row) => roleLabel(row.role),
            render: (row) =>
              canManage ? (
                <AdminRoleSelect
                  value={row.role}
                  onChange={(value) => {
                    void updatePlaceMembership(row.id, { role: value as PlaceRole })
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
                  }}
                  options={[
                    { value: "editor", label: t("admin.roles.placeEditor") },
                    { value: "manager", label: t("admin.roles.manager") },
                    { value: "owner", label: t("admin.roles.owner") },
                  ]}
                />
              ) : (
                <span className="admin-role-badge" data-role={row.role}>
                  {roleLabel(row.role)}
                </span>
              ),
          },
        ]}
        onDelete={
          canManage
            ? (row) => {
                void deletePlaceMembership(row.id)
                  .then(() => load())
                  .catch((err) => setError(err instanceof Error ? err.message : String(err)));
              }
            : undefined
        }
      />
    </section>
  );
}

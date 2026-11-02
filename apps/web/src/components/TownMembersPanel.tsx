import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminDataTable } from "./AdminDataTable";
import {
  createAccessGrant,
  deleteAccessGrant,
  getTownMembers,
  getUsers,
} from "../api/admin.api";

type Member = {
  id: string;
  role: string;
  user: { id: string; email: string; firstName: string; lastName: string };
};

export function TownMembersPanel({ townId }: { townId: string }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<Member["user"][]>([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [memberRows, userRows] = await Promise.all([getTownMembers(townId), getUsers()]);
    setMembers(memberRows);
    setUsers(userRows);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [townId]);

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ margin: "0 0 8px" }}>{t("admin.townMembers.title")}</h3>
      <p style={{ margin: "0 0 12px", color: "#475569" }}>{t("admin.townMembers.hint")}</p>
      {error ? <p style={{ color: "#991b1b" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} style={{ minHeight: 40, flex: 1 }}>
          <option value="">{t("admin.access.user")}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={!userId}
          onClick={() => {
            void createAccessGrant({ userId, kind: "town", targetId: townId, role: "editor" })
              .then(() => load())
              .catch((err) => setError(err instanceof Error ? err.message : String(err)));
          }}
        >
          {t("admin.townMembers.add")}
        </button>
      </div>
      <AdminDataTable
        items={members}
        getItemId={(row) => row.id}
        stateKey={`town-members-${townId}`}
        emptyMessage={t("admin.townMembers.empty")}
        columns={[
          {
            key: "name",
            label: t("common.name"),
            getText: (row) => `${row.user.firstName} ${row.user.lastName}`,
            render: (row) => `${row.user.firstName} ${row.user.lastName}`,
          },
          {
            key: "email",
            label: t("public.email"),
            getText: (row) => row.user.email,
            render: (row) => row.user.email,
          },
          {
            key: "role",
            label: t("admin.role"),
            getText: () => t("admin.roles.townMember"),
            render: () => (
              <span className="admin-role-badge" data-role="member">
                {t("admin.roles.townMember")}
              </span>
            ),
          },
        ]}
        onDelete={(row) => {
          void deleteAccessGrant("town", row.id).then(() => load());
        }}
      />
    </section>
  );
}

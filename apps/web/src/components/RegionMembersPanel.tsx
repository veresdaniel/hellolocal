import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createSiteMembership,
  deleteSiteMembership,
  getSiteMemberships,
  getUsers,
  updateSiteMembership,
  type CreateSiteMembershipDto,
  type SiteMembership,
  type UpdateSiteMembershipDto,
  type User,
} from "../api/admin.api";
import { AdminDataTable } from "./AdminDataTable";
import { AdminRoleSelect } from "./AdminRoleSelect";

type MembershipRole = "siteadmin" | "editor" | "viewer";

type RegionMembersPanelProps = {
  siteId: string;
};

export function RegionMembersPanel({ siteId }: RegionMembersPanelProps) {
  const { t } = useTranslation();
  const [memberships, setMemberships] = useState<SiteMembership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ userId: "", role: "editor" as MembershipRole });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadMemberships = async () => {
    if (!siteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSiteMemberships(siteId);
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadTenantMembershipsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ userId: "", role: "editor" });
    void loadMemberships();
    void getUsers()
      .then(setUsers)
      .catch((err) => console.error("Failed to load users", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const resetForm = () => {
    setFormData({ userId: "", role: "editor" });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.userId.trim()) errors.userId = t("admin.validation.userRequired");
    if (!formData.role) errors.role = t("admin.validation.roleRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      const dto: CreateSiteMembershipDto = {
        siteId,
        userId: formData.userId,
        role: formData.role,
      };
      await createSiteMembership(dto);
      setIsCreating(false);
      resetForm();
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createTenantMembershipFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;
    try {
      const dto: UpdateSiteMembershipDto = {
        role: formData.role === "viewer" ? "editor" : formData.role,
      };
      await updateSiteMembership(id, dto);
      setEditingId(null);
      resetForm();
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateSiteMembershipFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deleteTenantMembership"))) return;
    try {
      await deleteSiteMembership(id);
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteTenantMembershipFailed"));
    }
  };

  const startEdit = (membership: SiteMembership) => {
    setEditingId(membership.id);
    setIsCreating(false);
    setFormData({
      userId: membership.userId,
      role: membership.role,
    });
  };

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 8px", color: "var(--admin-primary)", fontSize: 20 }}>
            {t("admin.siteEdit.members.title")}
          </h2>
          <p style={{ margin: 0, color: "#64748b" }}>{t("admin.siteEdit.members.hint")}</p>
        </div>
        {!isCreating && !editingId && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
          >
            + {t("admin.forms.newTenantMembership")}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <label style={{ fontWeight: 600 }}>
            {t("admin.user")} *
            <select
              value={formData.userId}
              disabled={!!editingId}
              onChange={(event) => setFormData({ ...formData, userId: event.target.value })}
              style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }}
            >
              <option value="">{t("admin.selectUser")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </label>
          {formErrors.userId && <span style={{ color: "#dc3545" }}>{formErrors.userId}</span>}
          <label style={{ fontWeight: 600 }}>
            {t("admin.role")} *
            <AdminRoleSelect
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: value as MembershipRole })}
              options={[
                { value: "siteadmin", label: t("admin.roles.regionAdmin") },
                { value: "editor", label: t("admin.roles.regionEditor") },
                ...(formData.role === "viewer"
                  ? [{ value: "viewer", label: t("admin.roles.regionViewer") }]
                  : []),
              ]}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => (editingId ? void handleUpdate(editingId) : void handleCreate())}
            >
              {editingId ? t("common.update") : t("common.create")}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <div style={{ marginTop: 16 }}>
          <AdminDataTable
            items={memberships}
            getItemId={(membership) => membership.id}
            isLoading={isLoading}
            emptyMessage={t("admin.table.noData")}
            columns={[
              {
                key: "user",
                label: t("admin.user"),
                getText: (membership) =>
                  membership.user
                    ? `${membership.user.firstName} ${membership.user.lastName} ${membership.user.email}`
                    : membership.userId,
                render: (membership) =>
                  membership.user
                    ? `${membership.user.firstName} ${membership.user.lastName} (${membership.user.email})`
                    : membership.userId,
              },
              {
                key: "role",
                label: t("admin.role"),
                getText: (membership) =>
                  membership.role === "siteadmin"
                    ? t("admin.roles.regionAdmin")
                    : membership.role === "editor"
                      ? t("admin.roles.regionEditor")
                      : t("admin.roles.regionViewer"),
                render: (membership) => (
                  <span className="admin-role-badge" data-role={membership.role}>
                    {membership.role === "siteadmin"
                      ? t("admin.roles.regionAdmin")
                      : membership.role === "editor"
                        ? t("admin.roles.regionEditor")
                        : t("admin.roles.regionViewer")}
                  </span>
                ),
              },
            ]}
            stateKey="members"
            onEdit={startEdit}
            onDelete={(membership) => void handleDelete(membership.id)}
          />
        </div>
      )}
    </section>
  );
}

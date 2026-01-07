// src/pages/admin/UsersPage.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminTenant } from "../../contexts/AdminTenantContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  getUsers,
  getTenants,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  disableTwoFactorForUser,
  type User,
  type Tenant,
  type UpdateUserRoleDto,
  type CreateUserDto,
} from "../../api/admin.api";
import { TenantAutocomplete } from "../../components/TenantAutocomplete";
import { LoadingSpinner } from "../../components/LoadingSpinner";

export function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { selectedTenantId } = useAdminTenant();
  usePageTitle("admin.users");
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    bio: "",
    role: "viewer" as CreateUserDto["role"],
    isActive: true,
    tenantIds: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  // Load data on mount even if no tenant is selected (for superadmin)
  useEffect(() => {
    if (currentUser?.role === "superadmin") {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Superadmin can see all users, others need tenantId
      const tenantIdForQuery = currentUser?.role === "superadmin" ? undefined : (selectedTenantId || undefined);
      const [usersData, tenantsData] = await Promise.all([
        getUsers(tenantIdForQuery),
        getTenants(),
      ]);
      setUsers(usersData);
      setTenants(tenantsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadUsersFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.username.trim()) errors.username = t("admin.validation.usernameRequired");
    if (!formData.email.trim()) errors.email = t("admin.validation.emailRequired");
    if (!formData.firstName.trim()) errors.firstName = t("admin.validation.firstNameRequired");
    if (!formData.lastName.trim()) errors.lastName = t("admin.validation.lastNameRequired");
    if (isCreating && !formData.password.trim()) errors.password = t("admin.validation.passwordRequired");
    if (isCreating && formData.password.length < 6) errors.password = t("admin.validation.passwordMinLength");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      await createUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio || undefined,
        role: formData.role,
        isActive: formData.isActive,
        tenantIds: formData.tenantIds.length > 0 ? formData.tenantIds : undefined,
      });
      setIsCreating(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createUserFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      await updateUser(id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio || undefined,
        isActive: formData.isActive,
        tenantIds: formData.tenantIds.length > 0 ? formData.tenantIds : undefined,
      });
      setEditingId(null);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateUserFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteUser"))) return;

    try {
      await deleteUser(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deleteUserFailed"));
    }
  };

  const handleRoleChange = async (userId: string, newRole: UpdateUserRoleDto["role"]) => {
    if (!confirm(t("admin.confirmChangeRole", { role: newRole }))) {
      return;
    }

    try {
      await updateUserRole(userId, { role: newRole });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.errors.updateRoleFailed"));
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: "", // Don't show password
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || "",
      role: user.role,
      isActive: user.isActive,
      tenantIds: user.tenants.map((ut) => ut.tenantId),
    });
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      bio: "",
      role: "viewer",
      isActive: true,
      tenantIds: [],
    });
    setFormErrors({});
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>{t("admin.usersManagement")}</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setIsCreating(true);
            resetForm();
          }}
          disabled={!!editingId || isCreating}
          style={{
            padding: "12px 24px",
            background: editingId || isCreating ? "#999" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: editingId || isCreating ? "not-allowed" : "pointer",
            opacity: editingId || isCreating ? 0.6 : 1,
          }}
        >
          + {t("admin.forms.newUser")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16 }}>{editingId ? t("admin.forms.editUser") : t("admin.forms.newUser")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.username")} *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.username ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                  background: editingId ? "#f5f5f5" : "white",
                }}
              />
              {formErrors.username && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.username}</div>}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("public.email")} *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.email ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                  background: editingId ? "#f5f5f5" : "white",
                }}
              />
              {formErrors.email && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.email}</div>}
            </div>
          </div>

          {isCreating && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.password")} *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.password ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
              {formErrors.password && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.password}</div>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.firstName")} *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.firstName ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
              {formErrors.firstName && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.firstName}</div>}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.lastName")} *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  fontSize: 16,
                  border: formErrors.lastName ? "1px solid #dc3545" : "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
              {formErrors.lastName && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.lastName}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{t("admin.bio")}</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {isCreating && (
              <div>
                <label style={{ display: "block", marginBottom: 4 }}>{t("admin.role")} *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserDto["role"] })}
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            )}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: isCreating ? 0 : 24 }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                {t("common.active")}
              </label>
            </div>
          </div>

          <TenantAutocomplete
            selectedTenantIds={formData.tenantIds}
            onTenantIdsChange={(tenantIds) => setFormData({ ...formData, tenantIds })}
            allTenants={tenants}
          />

          {editingId && (
            <div style={{ marginBottom: 16, padding: 16, background: "#f8f9fa", borderRadius: 4, border: "1px solid #ddd" }}>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Two-Factor Authentication</h3>
              {(() => {
                const editingUser = users.find((u) => u.id === editingId);
                return editingUser?.isTwoFactorEnabled ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ color: "#28a745", fontWeight: 600 }}>✓ 2FA is enabled</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(t("admin.confirmDisable2FA"))) return;
                        try {
                          await disableTwoFactorForUser(editingId);
                          await loadData();
                          const updatedUser = users.find((u) => u.id === editingId);
                          if (updatedUser) {
                            startEdit(updatedUser);
                          }
                        } catch (err) {
                          alert(err instanceof Error ? err.message : t("admin.errors.disable2FAFailed"));
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: 14,
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {t("admin.disable2FA")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: "#6c757d" }}>2FA is disabled</span>
                    <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                      Users can enable 2FA from their profile page.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              style={{
                padding: "12px 24px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {editingId ? t("common.update") : t("common.create")}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                resetForm();
              }}
              style={{
                padding: "12px 24px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <LoadingSpinner isLoading={isLoading} />
      {!isLoading && !isCreating && !editingId ? (
        <div style={{ background: "white", borderRadius: 8, overflow: "hidden", border: "1px solid #ddd" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.username")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("public.email")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("common.name")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.role")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.tenants")}</th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "2px solid #ddd" }}>{t("admin.table.status")}</th>
                <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #ddd", width: "1%", whiteSpace: "nowrap" }}>{t("admin.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{user.username}</td>
                  <td style={{ padding: 12 }}>{user.email}</td>
                  <td style={{ padding: 12 }}>
                    {user.firstName} {user.lastName}
                  </td>
                  <td style={{ padding: 12 }}>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UpdateUserRoleDto["role"])}
                      disabled={user.role === "superadmin" && user.id !== currentUser?.id}
                      style={{
                        padding: "4px 8px",
                        fontSize: 14,
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        cursor: user.role === "superadmin" && user.id !== currentUser?.id ? "not-allowed" : "pointer",
                        background:
                          user.role === "superadmin"
                            ? "#9c27b0"
                            : user.role === "admin"
                            ? "#dc3545"
                            : user.role === "editor"
                            ? "#28a745"
                            : "#6c757d",
                        color: "white",
                      }}
                    >
                      <option value="viewer">{t("admin.roles.viewer")}</option>
                      <option value="editor">{t("admin.roles.editor")}</option>
                      <option value="admin">{t("admin.roles.admin")}</option>
                      <option value="superadmin">{t("admin.roles.superadmin")}</option>
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    {user.tenants.length === 0 ? (
                      <span style={{ color: "#999" }}>{t("common.none")}</span>
                    ) : (
                      <div>
                        {user.tenants.map((ut) => (
                          <div key={ut.id} style={{ marginBottom: 4 }}>
                            {ut.tenant.slug}
                            {ut.isPrimary && <span style={{ marginLeft: 4, color: "#007bff" }}>★</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: user.isActive ? "#28a745" : "#dc3545",
                        color: "white",
                        fontSize: 12,
                      }}
                    >
                      {user.isActive ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => startEdit(user)}
                        style={{
                          padding: "4px 8px",
                          background: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={user.role === "superadmin"}
                        style={{
                          padding: "4px 8px",
                          background: user.role === "superadmin" ? "#999" : "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: user.role === "superadmin" ? "not-allowed" : "pointer",
                          fontSize: 12,
                        }}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "#999" }}>No users found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

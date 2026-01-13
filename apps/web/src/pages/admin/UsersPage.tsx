// src/pages/admin/UsersPage.tsx
import { useState, useEffect, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  getUsers,
  getSites,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  disableTwoFactorForUser,
  type User,
  type Site,
  type UpdateUserRoleDto,
  type CreateUserDto,
} from "../../api/admin.api";
import { SiteAutocomplete } from "../../components/SiteAutocomplete";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { HAS_MULTIPLE_SITES } from "../../app/config";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";

export function UsersPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  usePageTitle("admin.users");
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    siteIds: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const previousPathnameRef = useRef<string>(location.pathname);

  useEffect(() => {
    loadData();
  }, [selectedSiteId]);

  // Load data on mount even if no tenant is selected (for superadmin)
  useEffect(() => {
    if (currentUser?.role === "superadmin") {
      loadData();
    }
  }, []);

  // Reset edit state when navigating away from this page
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathnameRef.current;
    
    // Only reset if pathname actually changed AND we're no longer on users page
    if (currentPath !== previousPath) {
      previousPathnameRef.current = currentPath;
      
      const isOnUsersPage = currentPath.includes("/admin/users");
      
      // Only reset if we're NOT on the users page AND we have edit state active
      if (!isOnUsersPage && (editingId || isCreating)) {
        setEditingId(null);
        setIsCreating(false);
        // Reset form data directly to avoid dependency issues
        setFormData({
          username: "",
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          bio: "",
          role: "viewer",
          isActive: true,
          siteIds: [],
        });
        setFormErrors({});
      }
    }
  }, [location.pathname, editingId, isCreating]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Superadmin can see all users, others need siteId
      const siteIdForQuery = currentUser?.role === "superadmin" ? undefined : (selectedSiteId || undefined);
      const [usersData, sitesData] = await Promise.all([
        getUsers(siteIdForQuery),
        getSites(),
      ]);
      setUsers(usersData);
      setSites(sitesData);
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
        siteIds: formData.siteIds.length > 0 ? formData.siteIds : undefined,
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
        siteIds: formData.siteIds.length > 0 ? formData.siteIds : undefined,
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
      siteIds: user.sites?.map((us) => us.siteId) || user.tenants?.map((ut) => ut.tenantId) || [],
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
      siteIds: [],
    });
    setFormErrors({});
  };

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(24px, 5vw, 32px)", flexWrap: "wrap", gap: 16 }}>
        <h1 style={{ 
          fontSize: "clamp(20px, 4vw, 28px)", 
          fontWeight: 700,
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white", 
          margin: 0,
          textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}>
          {t("admin.usersManagement")}
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setIsCreating(true);
            resetForm();
          }}
          disabled={!!editingId || isCreating}
          style={{
            padding: "12px 24px",
            background: editingId || isCreating ? "#e0e0e0" : "white",
            color: editingId || isCreating ? "#999" : "#667eea",
            border: editingId || isCreating ? "2px solid #ccc" : "2px solid #667eea",
            borderRadius: 8,
            cursor: editingId || isCreating ? "not-allowed" : "pointer",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: editingId || isCreating ? "none" : "0 4px 12px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!editingId && !isCreating) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
              e.currentTarget.style.background = "#f8f9fa";
            }
          }}
          onMouseLeave={(e) => {
            if (!editingId && !isCreating) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              e.currentTarget.style.background = "white";
            }
          }}
        >
          + {t("admin.forms.newUser")}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ padding: 24, background: "white", borderRadius: 8, marginBottom: 24, border: "1px solid #ddd" }}>
          <h2 style={{ marginBottom: 16, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{editingId ? t("admin.forms.editUser") : t("admin.forms.newUser")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.username")} *</label>
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
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("public.email")} *</label>
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
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.password")} *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="new-password"
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
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.firstName")} *</label>
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
              <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.lastName")} *</label>
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
                <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.role")} *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserDto["role"] })}
                  style={{ width: "100%", padding: 8, fontSize: 16, border: "1px solid #ddd", borderRadius: 4 }}
                >
                  <option value="viewer">{t("admin.roles.viewer")}</option>
                  <option value="editor">{t("admin.roles.editor")}</option>
                  <option value="admin">{t("admin.roles.admin")}</option>
                  <option value="superadmin">{t("admin.roles.superadmin")}</option>
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

          {HAS_MULTIPLE_SITES && (
            <SiteAutocomplete
              selectedSiteIds={formData.siteIds}
              onSiteIdsChange={(siteIds) => setFormData({ ...formData, siteIds })}
              allSites={sites}
            />
          )}

          {editingId && (
            <div style={{ marginBottom: 16, padding: 16, background: "#f8f9fa", borderRadius: 4, border: "1px solid #ddd" }}>
              <h3 style={{ marginBottom: 12, fontSize: 16, fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.profile.twoFactorAuthentication")}</h3>
              {(() => {
                const editingUser = users.find((u) => u.id === editingId);
                return editingUser?.isTwoFactorEnabled ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ color: "#28a745", fontWeight: 600 }}>✓ {t("admin.twoFactor.isEnabled")}</span>
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
                    <span style={{ color: "#6c757d" }}>{t("admin.twoFactor.disabled")}</span>
                    <p style={{ marginTop: 8, fontSize: 14, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                      {t("admin.profile.usersCanEnable2FA")}
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

      {!isCreating && !editingId && (
        <AdminResponsiveTable<User>
          data={users}
          getItemId={(user) => user.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.users")}
          filterFn={(user, query) => {
            const lowerQuery = query.toLowerCase();
            return (
              user.username.toLowerCase().includes(lowerQuery) ||
              user.email.toLowerCase().includes(lowerQuery) ||
              `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerQuery) ||
              user.role.toLowerCase().includes(lowerQuery)
            );
          }}
          isLoading={isLoading}
          columns={[
            {
              key: "username",
              label: t("admin.username"),
              render: (user) => user.username,
            },
            {
              key: "email",
              label: t("public.email"),
              render: (user) => user.email,
            },
            {
              key: "name",
              label: t("common.name"),
              render: (user) => `${user.firstName} ${user.lastName}`,
            },
            {
              key: "role",
              label: t("admin.role"),
              render: (user) => (
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
              ),
            },
            {
              key: "sites",
              label: t("admin.sites"),
              render: (user) => {
                const userSites = user.sites || user.tenants || [];
                return userSites.length === 0 ? (
                  <span style={{ color: "#999" }}>{t("common.none")}</span>
                ) : (
                  <div>
                    {userSites.map((us: any) => {
                      const site = us.site || us.tenant;
                      return (
                        <div key={us.id} style={{ marginBottom: 4 }}>
                          {site.slug}
                          {us.isPrimary && <span style={{ marginLeft: 4, color: "#007bff" }}>★</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              },
            },
            {
              key: "status",
              label: t("admin.table.status"),
              render: (user) => (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: user.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {user.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          cardTitle={(user) => `${user.firstName} ${user.lastName}`}
          cardSubtitle={(user) => user.username}
          cardFields={[
            {
              key: "email",
              render: (user) => (
                <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>
                  📧 {user.email}
                </div>
              ),
            },
            {
              key: "role",
              render: (user) => (
                <div style={{ marginBottom: 8 }}>
                  <select
                    value={user.role}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRoleChange(user.id, e.target.value as UpdateUserRoleDto["role"]);
                    }}
                    disabled={user.role === "superadmin" && user.id !== currentUser?.id}
                    style={{
                      padding: "6px 12px",
                      fontSize: 13,
                      borderRadius: 6,
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
                      fontWeight: 600,
                    }}
                  >
                    <option value="viewer">{t("admin.roles.viewer")}</option>
                    <option value="editor">{t("admin.roles.editor")}</option>
                    <option value="admin">{t("admin.roles.admin")}</option>
                    <option value="superadmin">{t("admin.roles.superadmin")}</option>
                  </select>
                </div>
              ),
            },
            {
              key: "sites",
              render: (user) => {
                const userSites = user.sites || user.tenants || [];
                return userSites.length > 0 ? (
                  <div style={{ marginBottom: 8, fontSize: 13, color: "#666" }}>
                    <strong>{t("admin.sites")}:</strong>{" "}
                    {userSites.map((us: any) => {
                      const site = us.site || us.tenant;
                      return site.slug + (us.isPrimary ? " ★" : "");
                    }).join(", ")}
                  </div>
                ) : null;
              },
            },
            {
              key: "status",
              render: (user) => (
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: user.isActive
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "#6c757d",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {user.isActive ? t("common.active") : t("common.inactive")}
                </span>
              ),
            },
          ]}
          onEdit={startEdit}
          onDelete={(user) => {
            if (user.role !== "superadmin") {
              handleDelete(user.id);
            }
          }}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  );
}

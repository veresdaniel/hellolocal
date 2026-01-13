// src/pages/admin/TenantMembershipsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { 
  getSiteMemberships, 
  createSiteMembership, 
  updateSiteMembership, 
  deleteSiteMembership,
  getSites,
  getUsers,
  type SiteMembership,
  type CreateSiteMembershipDto,
  type UpdateSiteMembershipDto,
  type Site,
  type User
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";

export function SiteMembershipsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  usePageTitle("admin.tenantMemberships");
  const [memberships, setMemberships] = useState<SiteMembership[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    siteId: "",
    userId: "",
    role: "editor" as "siteadmin" | "editor" | "viewer",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSites();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setFormData(prev => ({ ...prev, siteId: selectedSiteId }));
    }
    loadMemberships();
  }, [selectedSiteId]);

  const loadSites = async () => {
    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      console.error("Failed to load sites", err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const loadMemberships = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSiteMemberships(selectedSiteId || undefined);
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadTenantMembershipsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.siteId.trim()) errors.siteId = t("admin.validation.siteRequired");
    if (!formData.userId.trim()) errors.userId = t("admin.validation.userRequired");
    if (!formData.role) errors.role = t("admin.validation.roleRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const dto: CreateSiteMembershipDto = {
        siteId: formData.siteId,
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
      const dto: UpdateTenantMembershipDto = {
        role: formData.role,
      };
      await updateTenantMembership(id, dto);
      setEditingId(null);
      resetForm();
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateTenantMembershipFailed"));
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

  const resetForm = () => {
    setFormData({
      siteId: selectedSiteId || "",
      userId: "",
      role: "editor",
    });
    setFormErrors({});
  };

  const startEdit = (membership: SiteMembership) => {
    setEditingId(membership.id);
    setFormData({
      siteId: membership.siteId,
      userId: membership.userId,
      role: membership.role,
    });
  };

  const filteredMemberships = memberships.filter((membership) => {
    const siteName = membership.site?.slug || "";
    const userName = membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : "";
    const userEmail = membership.user?.email || "";
    return (
      siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      membership.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const columns: TableColumn<SiteMembership>[] = [
    {
      key: "site",
      label: t("admin.site"),
      render: (membership) => membership.site?.slug || membership.siteId,
    },
    {
      key: "user",
      label: t("admin.user"),
      render: (membership) => membership.user 
        ? `${membership.user.firstName} ${membership.user.lastName} (${membership.user.email})`
        : membership.userId,
    },
    {
      key: "role",
      label: t("admin.role"),
      render: (membership) => t(`admin.roles.${membership.role}`),
    },
  ];

  const cardFields: CardField<SiteMembership>[] = [
    { key: "site", label: t("admin.site"), render: (m) => m.site?.slug || m.siteId },
    { key: "user", label: t("admin.user"), render: (m) => m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId },
    { key: "role", label: t("admin.role"), render: (m) => t(`admin.roles.${m.role}`) },
  ];

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin) {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <AdminPageHeader
        title={t("admin.tenantMemberships")}
        newButtonLabel={t("admin.forms.newTenantMembership")}
        onNewClick={() => setIsCreating(true)}
        showNewButton={!isCreating && !editingId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => editingId ? handleUpdate(editingId) : handleCreate()}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          navigate("/admin");
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {error && (
        <div style={{ 
          padding: 16, 
          background: "#f8d7da", 
          color: "#721c24", 
          borderRadius: 8, 
          marginBottom: 24 
        }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ 
          padding: "clamp(24px, 5vw, 32px)", 
          background: "white", 
          borderRadius: 16, 
          marginBottom: 32, 
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.15)",
        }}>
          <h2 style={{ 
            marginBottom: 24, 
            color: "#667eea",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 700,
          }}>
            {editingId ? t("admin.forms.editTenantMembership") : t("admin.forms.newTenantMembership")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.tenant")} *
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                disabled={!!selectedSiteId || !!editingId}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: formErrors.siteId ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="">{t("admin.selectSite")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.translations.find(t => t.lang === "hu")?.name || site.slug}
                  </option>
                ))}
              </select>
              {formErrors.siteId && (
                <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.siteId}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.user")} *
              </label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: formErrors.userId ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="">{t("admin.selectUser")}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
              {formErrors.userId && (
                <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.userId}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.role")} *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "tenantadmin" | "editor" | "viewer" })}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: formErrors.role ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="siteadmin">{t("admin.roles.siteadmin")}</option>
                <option value="editor">{t("admin.roles.editor")}</option>
                <option value="viewer">{t("admin.roles.viewer")}</option>
              </select>
              {formErrors.role && (
                <p style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{formErrors.role}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<SiteMembership>
          data={filteredMemberships}
          getItemId={(membership) => membership.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.tenantMemberships")}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          filterFn={(membership, query) => {
            const lowerQuery = query.toLowerCase();
            const siteName = membership.site?.slug || "";
            const userName = membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : "";
            const userEmail = membership.user?.email || "";
            return (
              siteName.toLowerCase().includes(lowerQuery) ||
              userName.toLowerCase().includes(lowerQuery) ||
              userEmail.toLowerCase().includes(lowerQuery) ||
              membership.role.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={columns}
          cardTitle={(membership) => `${membership.site?.slug || membership.siteId} - ${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : membership.userId}`}
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={(membership) => handleDelete(membership.id)}
        />
      )}
    </div>
  );
}


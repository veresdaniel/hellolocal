// src/pages/admin/TenantMembershipsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/useAdminSite";
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
  type User,
} from "../../api/admin.api";
import {
  AdminResponsiveTable,
  type TableColumn,
  type CardField,
} from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { HAS_MULTIPLE_SITES } from "../../app/config";
import { isSuperadmin } from "../../utils/roleHelpers";

export function SiteMembershipsPage() {
  const { t, i18n } = useTranslation();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  const userIsSuperadmin = currentUser ? isSuperadmin(currentUser.role) : false;
  usePageTitle("admin.dashboardCards.regionAndMemberships");
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
    role: "editor" as "superadmin" | "siteadmin" | "editor" | "viewer",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userIsSuperadmin) {
      loadSites();
    }
    loadUsers();
  }, [userIsSuperadmin]);

  useEffect(() => {
    if (selectedSiteId) {
      setFormData((prev) => ({ ...prev, siteId: selectedSiteId }));
      loadMemberships();
    } else {
      // Safer empty state: never dump all sites' memberships when no régió is selected.
      setMemberships([]);
      setIsLoading(false);
      setError(null);
      setIsCreating(false);
      setEditingId(null);
    }
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
    if (!selectedSiteId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSiteMemberships(selectedSiteId);
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
        role: formData.role === "superadmin" ? "siteadmin" : formData.role,
      };
      await createSiteMembership(dto);
      setIsCreating(false);
      resetForm();
      await loadMemberships();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("admin.errors.createTenantMembershipFailed");

      // Check if membership already exists - if so, find it and switch to edit mode
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("SiteMembership already exists")
      ) {
        try {
          // Try to find the existing membership
          const existingMemberships = await getSiteMemberships(formData.siteId);
          const existing = existingMemberships.find(
            (m) => m.siteId === formData.siteId && m.userId === formData.userId
          );

          if (existing) {
            // Switch to edit mode with the existing membership
            setEditingId(existing.id);
            setFormData({
              siteId: existing.siteId,
              userId: existing.userId,
              role: existing.role,
            });
            setIsCreating(false);
            setError(
              t("admin.errors.membershipAlreadyExistsEdit") ||
                "This membership already exists. You can edit it below."
            );
          } else {
            setError(errorMessage);
          }
        } catch (findErr) {
          // If we can't find it, just show the error
          setError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }
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
    const userName = membership.user
      ? `${membership.user.firstName} ${membership.user.lastName}`
      : "";
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
      render: (membership) =>
        membership.user
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
    { key: "site", render: (m) => m.site?.slug || m.siteId },
    { key: "user", render: (m) => (m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId) },
    { key: "role", render: (m) => t(`admin.roles.${m.role}`) },
  ];

  const langPrefix = `/${i18n.language || "hu"}`;
  const siteSelectLocked = !userIsSuperadmin || !!selectedSiteId || !!editingId;

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.dashboardCards.regionAndMemberships")}
        subtitle={t("admin.dashboardCards.regionAndMembershipsDesc")}
        newButtonLabel={t("admin.forms.newTenantMembership")}
        onNewClick={() => setIsCreating(true)}
        showNewButton={!isCreating && !editingId && !!selectedSiteId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => (editingId ? handleUpdate(editingId) : handleCreate())}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
        backTo={`${langPrefix}/admin`}
      />

      {!selectedSiteId && (
        <div
          style={{
            padding: 16,
            background: "#fff3cd",
            color: "#856404",
            borderRadius: 8,
            marginBottom: 24,
            border: "1px solid #ffeeba",
          }}
        >
          {t("admin.selectSiteFirst")}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 16,
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* Region CRUD — superadmin only */}
      {userIsSuperadmin && HAS_MULTIPLE_SITES && !isCreating && !editingId && (
        <section
          style={{
            padding: "clamp(16px, 4vw, 24px)",
            background: "white",
            borderRadius: 16,
            marginBottom: 24,
            boxShadow: "var(--admin-shadow, 0 8px 24px rgba(15, 23, 42, 0.08))",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px 0",
              color: "var(--admin-primary, #2563eb)",
              fontSize: "clamp(18px, 4vw, 20px)",
              fontWeight: 700,
            }}
          >
            {t("admin.dashboardCards.manageRegions")}
          </h2>
          <p
            style={{
              margin: "0 0 16px 0",
              color: "#64748b",
              fontSize: "clamp(14px, 3vw, 15px)",
            }}
          >
            {t("admin.dashboardCards.manageRegionsHint")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Link
              to={`${langPrefix}/admin/sites`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                background: "var(--admin-primary, #2563eb)",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🗺️ {t("admin.dashboardCards.manageRegions")}
            </Link>
            {selectedSiteId && (
              <Link
                to={`${langPrefix}/admin/sites/${selectedSiteId}/edit`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: "#f1f5f9",
                  color: "#334155",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {t("admin.forms.editSite")}
              </Link>
            )}
          </div>
        </section>
      )}

      {!isCreating && !editingId && (
        <h2
          style={{
            margin: "0 0 16px 0",
            color: "var(--admin-primary, #2563eb)",
            fontSize: "clamp(18px, 4vw, 20px)",
            fontWeight: 700,
          }}
        >
          {t("admin.dashboardCards.membershipsSection")}
        </h2>
      )}

      {(isCreating || editingId) && (
        <div
          style={{
            padding: "clamp(24px, 5vw, 32px)",
            background: "white",
            borderRadius: 16,
            marginBottom: 32,
            boxShadow: "var(--admin-shadow, 0 8px 24px rgba(15, 23, 42, 0.08))",
          }}
        >
          <h2
            style={{
              marginBottom: 24,
              color: "var(--admin-primary, #2563eb)",
              fontSize: "clamp(20px, 5vw, 24px)",
              fontWeight: 700,
            }}
          >
            {editingId
              ? t("admin.forms.editTenantMembership")
              : t("admin.forms.newTenantMembership")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.site")} *
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                disabled={siteSelectLocked}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.siteId ? "2px solid #dc3545" : "2px solid var(--admin-primary-border, #bfdbfe)",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="">{t("admin.selectSite")}</option>
                {userIsSuperadmin
                  ? sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.translations.find((tr) => tr.lang === "hu")?.name || site.slug}
                      </option>
                    ))
                  : selectedSiteId && (
                      <option value={selectedSiteId}>
                        {sites.find((s) => s.id === selectedSiteId)?.slug || selectedSiteId}
                      </option>
                    )}
              </select>
              {formErrors.siteId && (
                <p
                  style={{
                    color: "#dc3545",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    marginTop: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {formErrors.siteId}
                </p>
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
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.userId ? "2px solid #dc3545" : "2px solid var(--admin-primary-border, #bfdbfe)",
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
                <p
                  style={{
                    color: "#dc3545",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    marginTop: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {formErrors.userId}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.role")} *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "siteadmin" | "editor" | "viewer",
                  })
                }
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.role ? "2px solid #dc3545" : "2px solid var(--admin-primary-border, #bfdbfe)",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="siteadmin">{t("admin.roles.siteadmin")}</option>
                <option value="editor">{t("admin.roles.editor")}</option>
                <option value="viewer">{t("admin.roles.viewer")}</option>
              </select>
              {formErrors.role && (
                <p
                  style={{
                    color: "#dc3545",
                    fontSize: "clamp(13px, 3vw, 15px)",
                    marginTop: 4,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {formErrors.role}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && selectedSiteId && (
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
            const userName = membership.user
              ? `${membership.user.firstName} ${membership.user.lastName}`
              : "";
            const userEmail = membership.user?.email || "";
            return (
              siteName.toLowerCase().includes(lowerQuery) ||
              userName.toLowerCase().includes(lowerQuery) ||
              userEmail.toLowerCase().includes(lowerQuery) ||
              membership.role.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={columns}
          cardTitle={(membership) =>
            `${membership.site?.slug || membership.siteId} - ${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : membership.userId}`
          }
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={(membership) => handleDelete(membership.id)}
        />
      )}
    </div>
  );
}

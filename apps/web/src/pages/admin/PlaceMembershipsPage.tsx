// src/pages/admin/PlaceMembershipsPage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAdminSite } from "../../contexts/AdminSiteContext";
import { 
  getPlaceMemberships, 
  createPlaceMembership, 
  updatePlaceMembership, 
  deletePlaceMembership,
  getPlaces,
  getUsers,
  type PlaceMembership,
  type CreatePlaceMembershipDto,
  type UpdatePlaceMembershipDto,
  type User
} from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { AdminResponsiveTable, type TableColumn, type CardField } from "../../components/AdminResponsiveTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import type { Place } from "../../types/place";

export function PlaceMembershipsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const { selectedSiteId } = useAdminSite();
  usePageTitle("admin.placeMemberships");
  const [memberships, setMemberships] = useState<PlaceMembership[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserPlaceRole, setCurrentUserPlaceRole] = useState<"owner" | "manager" | "editor" | null>(null);
  const [formData, setFormData] = useState({
    placeId: "",
    userId: "",
    role: "editor" as "owner" | "manager" | "editor",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadPlaces();
      loadMemberships();
    }
  }, [selectedSiteId]);

  // Check current user's place role when placeId changes
  useEffect(() => {
    if (formData.placeId && currentUser?.id) {
      checkCurrentUserPlaceRole(formData.placeId);
    } else {
      setCurrentUserPlaceRole(null);
    }
  }, [formData.placeId, currentUser?.id]);

  const loadPlaces = async () => {
    if (!selectedSiteId) return;
    try {
      const data = await getPlaces(selectedSiteId);
      // Handle both array and paginated response
      const placesArray = Array.isArray(data) ? data : (data?.places || []);
      setPlaces(placesArray);
    } catch (err) {
      console.error("Failed to load places", err);
      setPlaces([]); // Set empty array on error
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
      const data = await getPlaceMemberships(undefined, currentUser?.id);
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadPlaceMembershipsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentUserPlaceRole = async (placeId: string) => {
    if (!currentUser?.id) return;
    try {
      const data = await getPlaceMemberships(placeId, currentUser.id);
      const membership = data.find(m => m.placeId === placeId && m.userId === currentUser.id);
      setCurrentUserPlaceRole(membership?.role as "owner" | "manager" | "editor" | null || null);
    } catch (err) {
      console.error("Failed to check place role", err);
      setCurrentUserPlaceRole(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.placeId.trim()) errors.placeId = t("admin.validation.placeRequired");
    if (!formData.userId.trim()) errors.userId = t("admin.validation.userRequired");
    if (!formData.role) errors.role = t("admin.validation.roleRequired");
    
    // RBAC: Manager cannot assign owner role
    if (formData.role === "owner" && currentUserPlaceRole === "manager" && !isSuperadmin && currentUser?.role !== "admin") {
      errors.role = t("admin.errors.managerCannotAssignOwner");
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const dto: CreatePlaceMembershipDto = {
        placeId: formData.placeId,
        userId: formData.userId,
        role: formData.role,
      };
      await createPlaceMembership(dto);
      setIsCreating(false);
      resetForm();
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.createPlaceMembershipFailed"));
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validateForm()) return;

    try {
      const dto: UpdatePlaceMembershipDto = {
        role: formData.role,
      };
      await updatePlaceMembership(id, dto);
      setEditingId(null);
      resetForm();
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updatePlaceMembershipFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmations.deletePlaceMembership"))) return;

    try {
      await deletePlaceMembership(id);
      await loadMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.deletePlaceMembershipFailed"));
    }
  };

  const resetForm = () => {
    setFormData({
      placeId: "",
      userId: "",
      role: "editor",
    });
    setFormErrors({});
  };

  const startEdit = (membership: PlaceMembership) => {
    setEditingId(membership.id);
    setFormData({
      placeId: membership.placeId,
      userId: membership.userId,
      role: membership.role,
    });
    // Check current user's role for this place
    if (membership.placeId && currentUser?.id) {
      checkCurrentUserPlaceRole(membership.placeId);
    }
  };

  const filteredMemberships = memberships.filter((membership) => {
    const placeName = membership.place?.translations?.[0]?.name || "";
    const userName = membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : "";
    const userEmail = membership.user?.email || "";
    return (
      placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      membership.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const columns: TableColumn<PlaceMembership>[] = [
    {
      key: "place",
      label: t("admin.place"),
      render: (membership) => membership.place?.translations?.[0]?.name || membership.placeId,
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
      render: (membership) => {
        const roleLabel = t(`admin.roles.${membership.role}`);
        const isManager = membership.role === "manager";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{roleLabel}</span>
            {isManager && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#fff3cd",
                  color: "#856404",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid #ffc107",
                }}
              >
                {t("admin.restricted")}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const cardFields: CardField<PlaceMembership>[] = [
    { key: "place", render: (m) => m.place?.translations?.[0]?.name || m.placeId },
    { key: "user", render: (m) => m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId },
    { 
      key: "role", 
      render: (m) => {
        const roleLabel = t(`admin.roles.${m.role}`);
        const isManager = m.role === "manager";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>{roleLabel}</span>
            {isManager && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#fff3cd",
                  color: "#856404",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid #ffc107",
                }}
              >
                {t("admin.restricted")}
              </span>
            )}
          </div>
        );
      }
    },
  ];

  const isSuperadmin = currentUser?.role === "superadmin";

  if (!isSuperadmin && currentUser?.role !== "admin") {
    return <div style={{ padding: 24 }}>{t("admin.accessDenied")}</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <AdminPageHeader
        title={t("admin.placeMemberships")}
        newButtonLabel={t("admin.forms.newPlaceMembership")}
        onNewClick={() => setIsCreating(true)}
        showNewButton={!isCreating && !editingId && !!selectedSiteId}
        isCreatingOrEditing={isCreating || !!editingId}
        onSave={() => editingId ? handleUpdate(editingId) : handleCreate()}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          resetForm();
          // Back button will handle navigation
        }}
        saveLabel={editingId ? t("common.update") : t("common.create")}
      />

      {!selectedSiteId && (
        <div style={{ 
          padding: 16, 
          background: "#fff3cd", 
          color: "#856404", 
          borderRadius: 8, 
          marginBottom: 24 
        }}>
          {t("admin.selectSiteFirst")}
        </div>
      )}

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
            {editingId ? t("admin.forms.editPlaceMembership") : t("admin.forms.newPlaceMembership")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.place")} *
              </label>
              <select
                value={formData.placeId}
                onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.placeId ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="">{t("admin.selectPlace")}</option>
                {Array.isArray(places) && places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name || place.id}
                  </option>
                ))}
              </select>
              {formErrors.placeId && (
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.placeId}</p>
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
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.userId}</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                {t("admin.role")} *
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value as "owner" | "manager" | "editor";
                  // Prevent manager from selecting owner
                  if (newRole === "owner" && currentUserPlaceRole === "manager" && !isSuperadmin && currentUser?.role !== "admin") {
                    return;
                  }
                  setFormData({ ...formData, role: newRole });
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: formErrors.role ? "2px solid #dc3545" : "2px solid #e0e7ff",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              >
                <option value="editor">{t("admin.roles.editor")}</option>
                <option value="manager">{t("admin.roles.manager")}</option>
                {/* Owner option only visible to superadmin, siteadmin, or current owner */}
                {(isSuperadmin || currentUser?.role === "admin" || currentUserPlaceRole === "owner") && (
                  <option value="owner">{t("admin.roles.owner")}</option>
                )}
              </select>
              {/* Help text */}
              <div style={{ 
                marginTop: 8, 
                fontSize: "clamp(13px, 3vw, 15px)", 
                color: "#666", 
                lineHeight: 1.5,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                <div>{t("admin.roleDescriptions.owner")}</div>
                <div>{t("admin.roleDescriptions.manager")}</div>
                <div>{t("admin.roleDescriptions.editor")}</div>
              </div>
              {formErrors.role && (
                <p style={{ 
                  color: "#dc3545", 
                  fontSize: "clamp(13px, 3vw, 15px)", 
                  marginTop: 4,
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>{formErrors.role}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isCreating && !editingId && (
        <AdminResponsiveTable<PlaceMembership>
          data={filteredMemberships}
          getItemId={(membership) => membership.id}
          searchQuery={searchQuery}
          searchPlaceholder={t("admin.searchPlaceholders.placeMemberships")}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
          filterFn={(membership, query) => {
            const lowerQuery = query.toLowerCase();
            const placeName = membership.place?.translations?.[0]?.name || "";
            const userName = membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : "";
            const userEmail = membership.user?.email || "";
            return (
              placeName.toLowerCase().includes(lowerQuery) ||
              userName.toLowerCase().includes(lowerQuery) ||
              userEmail.toLowerCase().includes(lowerQuery) ||
              membership.role.toLowerCase().includes(lowerQuery)
            );
          }}
          columns={columns}
          cardTitle={(membership) => `${membership.place?.translations?.[0]?.name || membership.placeId} - ${membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : membership.userId}`}
          cardFields={cardFields}
          onEdit={startEdit}
          onDelete={(membership) => handleDelete(membership.id)}
        />
      )}
    </div>
  );
}

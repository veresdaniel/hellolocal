// src/pages/admin/UserProfilePage.tsx
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  updateUser,
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
} from "../../api/admin.api";
import type { User } from "../../api/admin.api";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_EDITOR } from "../../types/enums";

export function UserProfilePage() {
  const { t } = useTranslation();
  usePageTitle("admin.profile.title");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
  });

  // 2FA state
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadUser();
    loadTwoFactorStatus();
  }, []);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      // Ensure role is lowercase
      const userData = {
        ...data,
        role: data.role.toLowerCase() as User["role"],
      };
      setUser(userData);
      setFormData({
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio || "",
      });
      // Update localStorage with fresh user data
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.role = userData.role;
        localStorage.setItem("user", JSON.stringify(parsedUser));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.loadUsersFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      if (!user) return;
      const updated = await updateUser(user.id, formData);
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errors.updateUserFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const loadTwoFactorStatus = async () => {
    try {
      const status = await getTwoFactorStatus();
      setIsTwoFactorEnabled(status.isEnabled);
    } catch (err) {
      // Silently fail - 2FA might not be available or user might not have the field yet
      console.warn("Failed to load 2FA status:", err);
      setIsTwoFactorEnabled(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    setIsTwoFactorLoading(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    try {
      const result = await setupTwoFactor();
      setQrCodeUrl(result.qrCodeUrl);
      setTwoFactorSecret(result.manualEntryKey);
      setTwoFactorSuccess(t("admin.twoFactor.scanQRCodeThenVerify"));
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : t("admin.twoFactor.setupFailed"));
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setTwoFactorError(t("admin.twoFactor.pleaseEnterValidCode"));
      return;
    }

    setIsVerifying(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    try {
      const result = await verifyAndEnableTwoFactor(verificationToken);
      if (result.verified) {
        setTwoFactorSuccess(t("admin.twoFactor.verifySuccess"));
        setQrCodeUrl(null);
        setTwoFactorSecret(null);
        setVerificationToken("");
        await loadTwoFactorStatus();
      } else {
        setTwoFactorError(result.message || t("admin.twoFactor.verifyFailed"));
      }
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : t("admin.twoFactor.verifyFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!confirm(t("admin.twoFactor.disableConfirm"))) {
      return;
    }

    if (!user) {
      setTwoFactorError(t("admin.errors.userNotFound"));
      return;
    }

    setIsTwoFactorLoading(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    try {
      await disableTwoFactor(user.id);
      setTwoFactorSuccess(t("admin.twoFactor.disableSuccess"));
      setQrCodeUrl(null);
      setTwoFactorSecret(null);
      setVerificationToken("");
      await loadTwoFactorStatus();
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : t("admin.twoFactor.disableFailed"));
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 24 }}>{t("admin.errors.userNotFound")}</div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header matching AdminDashboard style */}
        <div style={{ marginBottom: "clamp(24px, 5vw, 32px)" }}>
          <h1 style={{ 
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            color: "white",
            margin: 0,
            marginBottom: 8,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}>
            {t("admin.profile.title")}
          </h1>
          <p style={{ 
            fontSize: "clamp(13px, 3vw, 14px)",
            color: "#c0c0d0",
            margin: 0,
            textShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
          }}>
            {user.username} • {user.email}
          </p>
        </div>

      {error && (
        <div style={{ 
          padding: "clamp(12px, 3vw, 16px)",
          marginBottom: 24,
          background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          color: "#991b1b",
          borderRadius: 12,
          border: "1px solid #fca5a5",
          fontSize: "clamp(13px, 3vw, 14px)",
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: "clamp(12px, 3vw, 16px)",
          marginBottom: 24,
          background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
          color: "#065f46",
          borderRadius: 12,
          border: "1px solid #6ee7b7",
          fontSize: "clamp(13px, 3vw, 14px)",
          fontWeight: 500,
        }}>
          {t("admin.profile.profileUpdatedSuccess")}
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: 24 
      }}>
        <div>
          <h2 style={{
            marginBottom: 16,
            color: "white",
            fontSize: "clamp(18px, 4vw, 20px)",
            fontWeight: 700,
          }}>
            {t("admin.profile.profileInformation")}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ 
              padding: "clamp(20px, 4vw, 24px)", 
              background: "white", 
              borderRadius: 12,
              boxShadow: "0 4px 16px rgba(102, 126, 234, 0.12)",
              border: "1px solid rgba(102, 126, 234, 0.1)",
            }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#4b5563",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}>
                {t("admin.username")}
              </label>
              <input
                type="text"
                value={user.username}
                disabled
                style={{ 
                  width: "100%", 
                  padding: "clamp(10px, 2vw, 12px)", 
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  background: "#f5f5f5",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#6b7280",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#4b5563",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}>
                {t("admin.email")}
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ 
                  width: "100%", 
                  padding: "clamp(10px, 2vw, 12px)", 
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  background: "#f5f5f5",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#6b7280",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#4b5563",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}>
                {t("admin.fields.firstName")}
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={{ 
                  width: "100%", 
                  padding: "clamp(10px, 2vw, 12px)", 
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: "2px solid #e0e7ff",
                  borderRadius: 8,
                  transition: "all 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e0e7ff"}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#4b5563",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}>
                {t("admin.fields.lastName")}
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={{ 
                  width: "100%", 
                  padding: "clamp(10px, 2vw, 12px)", 
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: "2px solid #e0e7ff",
                  borderRadius: 8,
                  transition: "all 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e0e7ff"}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#4b5563",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
              }}>
                {t("admin.fields.bio")}
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                style={{ 
                  width: "100%", 
                  padding: "clamp(10px, 2vw, 12px)", 
                  fontSize: "clamp(15px, 3.5vw, 16px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  border: "2px solid #e0e7ff",
                  borderRadius: 8,
                  transition: "all 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e0e7ff"}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "10px 20px",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 600,
                background: isSaving ? "#ddd" : "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                color: isSaving ? "#999" : "white",
                border: "none",
                borderRadius: 8,
                cursor: isSaving ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: isSaving ? "none" : "0 4px 12px rgba(40, 167, 69, 0.3)",
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                }
              }}
            >
              {isSaving ? t("admin.profile.saving") : t("admin.profile.saveChanges")}
            </button>
            </div>
          </form>
        </div>

        <div>
          <h2 style={{
            marginBottom: 16,
            color: "white",
            fontSize: "clamp(18px, 4vw, 20px)",
            fontWeight: 700,
          }}>
            {t("admin.profile.accountInformation")}
          </h2>
          <div style={{ 
            padding: "clamp(20px, 4vw, 24px)", 
            background: "white",
            borderRadius: 12,
            marginBottom: 24,
            boxShadow: "0 4px 16px rgba(102, 126, 234, 0.12)",
            border: "1px solid rgba(102, 126, 234, 0.1)",
          }}>
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
              <strong style={{ 
                color: "#4b5563", 
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>{t("admin.role")}:</strong>{" "}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  background:
                    user.role === ROLE_SUPERADMIN
                      ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                      : user.role === ROLE_ADMIN
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : user.role === ROLE_EDITOR
                      ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
                      : "#6c757d",
                  color: "white",
                  fontSize: "clamp(13px, 3vw, 15px)",
                  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  display: "inline-block",
                  marginLeft: 8,
                }}
              >
                {user.role}
              </span>
            </div>
            <div style={{ 
              marginBottom: 16, 
              paddingBottom: 16, 
              borderBottom: "1px solid #e5e7eb", 
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <strong style={{ color: "#4b5563" }}>{t("admin.table.status")}:</strong>{" "}
              <span style={{ 
                color: user.isActive ? "#059669" : "#dc2626",
                fontWeight: 600,
              }}>
                {user.isActive ? t("common.active") : t("common.inactive")}
              </span>
            </div>
            <div style={{ 
              marginBottom: 16, 
              paddingBottom: 16, 
              borderBottom: "1px solid #e5e7eb", 
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <strong style={{ color: "#4b5563" }}>{t("admin.profile.memberSince")}:</strong>{" "}
              <span style={{ color: "#6b7280" }}>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ 
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <strong style={{ color: "#4b5563" }}>{t("admin.profile.lastUpdated")}:</strong>{" "}
              <span style={{ color: "#6b7280" }}>{new Date(user.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <h3 style={{
            marginBottom: 16,
            color: "white",
            fontSize: "clamp(16px, 3vw, 18px)",
            fontWeight: 700,
          }}>
            {t("admin.tenants")}
          </h3>
          <div style={{ 
            padding: "clamp(16px, 3vw, 20px)", 
            background: "white",
            borderRadius: 12,
            marginBottom: 24,
            boxShadow: "0 4px 16px rgba(102, 126, 234, 0.12)",
            border: "1px solid rgba(102, 126, 234, 0.1)",
          }}>
            {!user.sites || user.sites.length === 0 ? (
              <div style={{ 
                color: "#6b7280", 
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>{t("admin.profile.noTenantsAssigned")}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, color: "#374151" }}>
                {user.sites.map((ut) => (
                  <li key={ut.siteId} style={{ 
                    marginBottom: 8, 
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>
                    {ut.site.slug}
                    {ut.isPrimary && <span style={{ marginLeft: 8, color: "#667eea", fontWeight: 600 }}>★ {t("admin.profile.primary")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 style={{
            marginBottom: 16,
            color: "white",
            fontSize: "clamp(16px, 3vw, 18px)",
            fontWeight: 700,
          }}>
            {t("admin.profile.twoFactorAuthentication")}
          </h3>
          <div style={{ 
            padding: "clamp(16px, 3vw, 20px)", 
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(102, 126, 234, 0.12)",
            border: "1px solid rgba(102, 126, 234, 0.1)",
          }}>
            {twoFactorError && (
              <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 6, fontSize: 14, border: "1px solid #fcc", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {twoFactorError}
              </div>
            )}

            {twoFactorSuccess && (
              <div style={{ padding: 12, marginBottom: 16, background: "#efe", color: "#0a0", borderRadius: 6, fontSize: 14, border: "1px solid #cfc", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {twoFactorSuccess}
              </div>
            )}

            {isTwoFactorEnabled ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: 12, background: "#f0f9ff", borderRadius: 6, border: "1px solid #b3d9ff" }}>
                  <span style={{ fontSize: 20 }}>✓</span>
                  <span style={{ 
                    color: "#28a745", 
                    fontWeight: 600, 
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}>{t("admin.twoFactor.isEnabled")}</span>
                </div>
                <p style={{ marginBottom: 16, color: "#666", fontSize: 14, lineHeight: 1.5, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {t("admin.twoFactor.accountProtected")}
                </p>
                <button
                  onClick={handleDisableTwoFactor}
                  disabled={isTwoFactorLoading}
                  style={{
                    padding: "10px 20px",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    background: isTwoFactorLoading ? "#ddd" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: isTwoFactorLoading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isTwoFactorLoading ? "none" : "0 4px 12px rgba(245, 87, 108, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isTwoFactorLoading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 87, 108, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTwoFactorLoading) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.3)";
                    }
                  }}
                >
                  {isTwoFactorLoading ? t("admin.twoFactor.disabling") : t("admin.twoFactor.disable")}
                </button>
              </div>
            ) : (
              <div>
                {!qrCodeUrl ? (
                  <div>
                    <p style={{ marginBottom: 16, color: "#555", fontSize: 14, lineHeight: 1.6 }}>
                      {t("admin.twoFactor.addsExtraSecurity")}
                    </p>
                    <button
                      onClick={handleSetupTwoFactor}
                      disabled={isTwoFactorLoading}
                      style={{
                        padding: "10px 20px",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontWeight: 600,
                        background: isTwoFactorLoading ? "#ddd" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: isTwoFactorLoading ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isTwoFactorLoading ? "none" : "0 4px 12px rgba(102, 126, 234, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isTwoFactorLoading) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isTwoFactorLoading) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                        }
                      }}
                    >
                      {isTwoFactorLoading ? t("admin.twoFactor.settingUp") : t("admin.twoFactor.enable")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 20, padding: 16, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e0e0e0" }}>
                      <p style={{ 
                        marginBottom: 16, 
                        fontWeight: 600, 
                        fontSize: "clamp(15px, 3.5vw, 16px)", 
                        color: "#333",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>
                        {t("admin.twoFactor.scanQRCodeDescription")}
                      </p>
                      {qrCodeUrl && (
                        <div style={{ marginBottom: 16, textAlign: "center", padding: 12, background: "white", borderRadius: 8, border: "1px solid #ddd" }}>
                          <img src={qrCodeUrl} alt={t("admin.profile.qrCodeAlt")} style={{ maxWidth: 220, height: "auto", display: "block", margin: "0 auto" }} />
                        </div>
                      )}
                      {twoFactorSecret && (
                        <div style={{ marginBottom: 0, padding: 12, background: "white", borderRadius: 6, border: "1px solid #ddd" }}>
                          <p style={{ 
                            marginBottom: 6, 
                            fontSize: "clamp(14px, 3.5vw, 16px)", 
                            color: "#666", 
                            fontWeight: 500, 
                            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          }}>{t("admin.twoFactor.orEnterKeyManually")}</p>
                          <code style={{ 
                            fontFamily: "monospace", 
                            fontSize: "clamp(13px, 3vw, 15px)", 
                            padding: "8px 12px", 
                            background: "#f5f5f5", 
                            borderRadius: 4, 
                            display: "block", 
                            wordBreak: "break-all", 
                            border: "1px solid #e0e0e0",
                          }}>
                            {twoFactorSecret}
                          </code>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ 
                        display: "block", 
                        marginBottom: 8, 
                        fontWeight: 600, 
                        fontSize: "clamp(14px, 3.5vw, 16px)", 
                        color: "#333",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      }}>
                        {t("admin.twoFactor.enter6DigitCode")}
                      </label>
                      <input
                        type="text"
                        value={verificationToken}
                        onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        style={{
                          width: "100%",
                          padding: 12,
                          fontSize: 18,
                          textAlign: "center",
                          letterSpacing: 6,
                          fontFamily: "monospace",
                          border: "2px solid #ddd",
                          borderRadius: 6,
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#007bff")}
                        onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        onClick={handleVerifyTwoFactor}
                        disabled={isVerifying || verificationToken.length !== 6}
                        style={{
                          flex: 1,
                          padding: "12px 20px",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          fontWeight: 600,
                          background: verificationToken.length === 6 && !isVerifying ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)" : "#ddd",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          cursor: verificationToken.length === 6 && !isVerifying ? "pointer" : "not-allowed",
                          transition: "all 0.2s ease",
                          boxShadow: verificationToken.length === 6 && !isVerifying ? "0 4px 12px rgba(40, 167, 69, 0.3)" : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (verificationToken.length === 6 && !isVerifying) {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (verificationToken.length === 6 && !isVerifying) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                          }
                        }}
                      >
                        {isVerifying ? t("admin.twoFactor.verifying") : t("admin.twoFactor.verifyAndEnable")}
                      </button>
                      <button
                        onClick={() => {
                          setQrCodeUrl(null);
                          setTwoFactorSecret(null);
                          setVerificationToken("");
                          setTwoFactorError(null);
                          setTwoFactorSuccess(null);
                        }}
                        style={{
                          padding: "12px 20px",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          fontWeight: 600,
                          background: "white",
                          color: "#6c757d",
                          border: "2px solid #6c757d",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f8f9fa";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}


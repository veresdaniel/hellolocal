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
      <>
        <LoadingSpinner isLoading={isLoading} />
        <div style={{ padding: 24 }}>{t("admin.errors.userNotFound")}</div>
      </>
    );
  }

  return (
    <>
      <LoadingSpinner isLoading={isLoading} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>{t("admin.profile.title")}</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: 12, marginBottom: 16, background: "#efe", color: "#0a0", borderRadius: 4 }}>
          {t("admin.profile.profileUpdatedSuccess")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h2 style={{ marginBottom: 16 }}>{t("admin.profile.profileInformation")}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.username")}</label>
              <input
                type="text"
                value={user.username}
                disabled
                style={{ width: "100%", padding: 8, fontSize: 16, background: "#f5f5f5" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.email")}</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ width: "100%", padding: 8, fontSize: 16, background: "#f5f5f5" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.fields.firstName")}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.fields.lastName")}</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4 }}>{t("admin.fields.bio")}</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                style={{ width: "100%", padding: 8, fontSize: 16 }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? t("admin.profile.saving") : t("admin.profile.saveChanges")}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ marginBottom: 16 }}>{t("admin.profile.accountInformation")}</h2>
          <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 4 }}>
            <div style={{ marginBottom: 12 }}>
              <strong>{t("admin.role")}:</strong>{" "}
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  background:
                    user.role === "superadmin"
                      ? "#dc3545"
                      : user.role === "admin"
                      ? "#007bff"
                      : user.role === "editor"
                      ? "#28a745"
                      : "#6c757d",
                  color: "white",
                  fontSize: 12,
                }}
              >
                {user.role}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>{t("admin.table.status")}:</strong> {user.isActive ? t("common.active") : t("common.inactive")}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>{t("admin.profile.memberSince")}:</strong> {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>{t("admin.profile.lastUpdated")}:</strong> {new Date(user.updatedAt).toLocaleDateString()}
            </div>
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 16 }}>{t("admin.tenants")}</h3>
          <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 4 }}>
            {!user.tenants || user.tenants.length === 0 ? (
              <div>{t("admin.profile.noTenantsAssigned")}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {user.tenants.map((ut: any) => (
                  <li key={ut.id}>
                    {ut.tenant.slug}
                    {ut.isPrimary && <span style={{ marginLeft: 8, color: "#007bff" }}>({t("admin.profile.primary")})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>{t("admin.profile.twoFactorAuthentication")}</h3>
          <div style={{ padding: 20, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            {twoFactorError && (
              <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 6, fontSize: 14, border: "1px solid #fcc" }}>
                {twoFactorError}
              </div>
            )}

            {twoFactorSuccess && (
              <div style={{ padding: 12, marginBottom: 16, background: "#efe", color: "#0a0", borderRadius: 6, fontSize: 14, border: "1px solid #cfc" }}>
                {twoFactorSuccess}
              </div>
            )}

            {isTwoFactorEnabled ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: 12, background: "#f0f9ff", borderRadius: 6, border: "1px solid #b3d9ff" }}>
                  <span style={{ fontSize: 20 }}>✓</span>
                  <span style={{ color: "#28a745", fontWeight: 600, fontSize: 15 }}>{t("admin.twoFactor.isEnabled")}</span>
                </div>
                <p style={{ marginBottom: 16, color: "#666", fontSize: 14, lineHeight: 1.5 }}>
                  {t("admin.twoFactor.accountProtected")}
                </p>
                <button
                  onClick={handleDisableTwoFactor}
                  disabled={isTwoFactorLoading}
                  style={{
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    background: isTwoFactorLoading ? "#ccc" : "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: isTwoFactorLoading ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
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
                        padding: "12px 24px",
                        fontSize: 15,
                        fontWeight: 500,
                        background: isTwoFactorLoading ? "#ccc" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: isTwoFactorLoading ? "not-allowed" : "pointer",
                        transition: "background 0.2s",
                      }}
                    >
                      {isTwoFactorLoading ? t("admin.twoFactor.settingUp") : t("admin.twoFactor.enable")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 20, padding: 16, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e0e0e0" }}>
                      <p style={{ marginBottom: 16, fontWeight: 600, fontSize: 15, color: "#333" }}>
                        {t("admin.twoFactor.scanQRCodeDescription")}
                      </p>
                      {qrCodeUrl && (
                        <div style={{ marginBottom: 16, textAlign: "center", padding: 12, background: "white", borderRadius: 8, border: "1px solid #ddd" }}>
                          <img src={qrCodeUrl} alt={t("admin.profile.qrCodeAlt")} style={{ maxWidth: 220, height: "auto", display: "block", margin: "0 auto" }} />
                        </div>
                      )}
                      {twoFactorSecret && (
                        <div style={{ marginBottom: 0, padding: 12, background: "white", borderRadius: 6, border: "1px solid #ddd" }}>
                          <p style={{ marginBottom: 6, fontSize: 13, color: "#666", fontWeight: 500 }}>{t("admin.twoFactor.orEnterKeyManually")}</p>
                          <code style={{ fontFamily: "monospace", fontSize: 13, padding: "8px 12px", background: "#f5f5f5", borderRadius: 4, display: "block", wordBreak: "break-all", border: "1px solid #e0e0e0" }}>
                            {twoFactorSecret}
                          </code>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#333" }}>
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
                          fontSize: 15,
                          fontWeight: 500,
                          background: verificationToken.length === 6 && !isVerifying ? "#28a745" : "#ccc",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: verificationToken.length === 6 && !isVerifying ? "pointer" : "not-allowed",
                          transition: "background 0.2s",
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
                          fontSize: 15,
                          fontWeight: 500,
                          background: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#5a6268")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#6c757d")}
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


// src/pages/auth/ResetPasswordPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useParams } from "react-router-dom";
import { resetPassword } from "../../api/auth.api";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../../app/config";
import { useSeo } from "../../seo/useSeo";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { t, i18n } = useTranslation();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam)
    ? langParam
    : isLang(i18n.language)
      ? i18n.language
      : DEFAULT_LANG;

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // Auth pages should have noindex, nofollow robots meta tag
  useSeo({
    title: t("admin.resetPassword") || "Reset Password",
    description: "",
    robots: "noindex, nofollow",
  });

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    if (value && value.length < 6) {
      setPasswordError(t("admin.passwordTooShort"));
    } else {
      setPasswordError(null);
    }
    // Check confirm match
    if (confirmPassword && value !== confirmPassword) {
      setConfirmError(t("admin.passwordsDoNotMatch"));
    } else {
      setConfirmError(null);
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== newPassword) {
      setConfirmError(t("admin.passwordsDoNotMatch"));
    } else {
      setConfirmError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setConfirmError(t("admin.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t("admin.passwordTooShort"));
      return;
    }

    if (!token) {
      setError(t("admin.resetTokenMissing"));
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate(`/${lang}/admin/login`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.resetPasswordFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          minWidth: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "16px",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: "white",
            borderRadius: 16,
            padding: "clamp(24px, 5vw, 40px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
          <h1
            style={{
              marginBottom: 16,
              color: "#667eea",
              fontSize: "clamp(24px, 6vw, 32px)",
              fontWeight: 700,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.passwordResetSuccess")}
          </h1>
          <div
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              marginBottom: "clamp(16px, 4vw, 24px)",
              background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
              color: "#065f46",
              borderRadius: 12,
              border: "1px solid #6ee7b7",
              fontSize: "clamp(13px, 3vw, 14px)",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.passwordResetSuccessMessage")}
          </div>
          <Link
            to={`/${lang}/admin/login`}
            style={{
              display: "inline-block",
              padding: "clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)",
              fontSize: "clamp(15px, 3.5vw, 16px)",
              fontWeight: 600,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
            }}
          >
            {t("admin.goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "16px",
        margin: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "white",
          borderRadius: 16,
          padding: "clamp(24px, 5vw, 40px)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h1
          style={{
            marginBottom: 8,
            textAlign: "center",
            color: "#667eea",
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 700,
            fontFamily:
              "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.resetPassword")}
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "clamp(20px, 4vw, 32px)",
            fontSize: "clamp(13px, 3vw, 14px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 400,
          }}
        >
          {t("admin.resetPasswordDescription")}
        </p>

        {error && (
          <div
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              marginBottom: "clamp(16px, 4vw, 24px)",
              background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
              color: "#991b1b",
              borderRadius: 12,
              border: "1px solid #fca5a5",
              fontSize: "clamp(13px, 3vw, 14px)",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {!token && (
          <div
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              marginBottom: "clamp(16px, 4vw, 24px)",
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              color: "#92400e",
              borderRadius: 12,
              border: "1px solid #fcd34d",
              fontSize: "clamp(13px, 3vw, 14px)",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.noResetToken")}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: passwordError ? "#dc2626" : "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.newPassword")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: `2px solid ${passwordError ? "#fca5a5" : "#e0e7ff"}`,
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                backgroundColor: passwordError ? "#fef2f2" : "white",
              }}
              onFocus={(e) => {
                if (!passwordError) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }
              }}
              onBlur={(e) => {
                if (!passwordError) {
                  e.currentTarget.style.borderColor = "#e0e7ff";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            {passwordError && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: "clamp(11px, 2.5vw, 12px)",
                  color: "#dc2626",
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {passwordError}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: confirmError ? "#dc2626" : "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.confirmPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => handleConfirmChange(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: `2px solid ${confirmError ? "#fca5a5" : "#e0e7ff"}`,
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                backgroundColor: confirmError ? "#fef2f2" : "white",
              }}
              onFocus={(e) => {
                if (!confirmError) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }
              }}
              onBlur={(e) => {
                if (!confirmError) {
                  e.currentTarget.style.borderColor = "#e0e7ff";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            {confirmError && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: "clamp(11px, 2.5vw, 12px)",
                  color: "#dc2626",
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {confirmError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            style={{
              width: "100%",
              padding: "clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)",
              fontSize: "clamp(15px, 3.5vw, 16px)",
              fontWeight: 600,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background:
                isLoading || !token
                  ? "#a5b4fc"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isLoading || !token ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: isLoading || !token ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && token) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && token) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {isLoading ? t("admin.resetting") : t("admin.resetPassword")}
          </button>
        </form>

        <div style={{ marginTop: "clamp(20px, 4vw, 24px)", textAlign: "center" }}>
          <Link
            to={`/${lang}/admin/login`}
            style={{
              color: "#667eea",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textDecoration: "none",
              fontSize: "clamp(13px, 3vw, 14px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            {t("admin.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

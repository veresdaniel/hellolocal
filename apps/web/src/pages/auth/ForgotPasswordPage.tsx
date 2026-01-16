// src/pages/auth/ForgotPasswordPage.tsx
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { forgotPassword } from "../../api/auth.api";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../../app/config";
import { useSeo } from "../../seo/useSeo";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function ForgotPasswordPage() {
  const { lang: langParam } = useParams<{ lang?: string }>();
  const { t, i18n } = useTranslation();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam)
    ? langParam
    : isLang(i18n.language)
      ? i18n.language
      : DEFAULT_LANG;

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  // Auth pages should have noindex, nofollow robots meta tag
  useSeo({
    title: t("admin.forgotPassword") || "Forgot Password",
    description: "",
    robots: "noindex, nofollow",
  });

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !emailRegex.test(value)) {
      setEmailError(t("admin.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate email before submitting
    if (!emailRegex.test(email)) {
      setEmailError(t("admin.invalidEmail"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword({ email });
      setSuccess(response.message);
      // In development, show the reset token if provided
      if (response.resetToken) {
        setSuccess(`${response.message}\n\n${t("admin.resetToken")}: ${response.resetToken}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.resetEmailFailed"));
    } finally {
      setIsLoading(false);
    }
  };

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
          {t("admin.forgotPassword")}
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
          {t("admin.forgotPasswordDescription")}
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

        {success && (
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
              whiteSpace: "pre-wrap",
            }}
          >
            {success}
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
                color: emailError ? "#dc2626" : "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: `2px solid ${emailError ? "#fca5a5" : "#e0e7ff"}`,
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                backgroundColor: emailError ? "#fef2f2" : "white",
              }}
              onFocus={(e) => {
                if (!emailError) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }
              }}
              onBlur={(e) => {
                if (!emailError) {
                  e.currentTarget.style.borderColor = "#e0e7ff";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            />
            {emailError && (
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
                {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)",
              fontSize: "clamp(15px, 3.5vw, 16px)",
              fontWeight: 600,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background: isLoading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: isLoading ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {isLoading ? t("admin.sending") : t("admin.sendResetLink")}
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

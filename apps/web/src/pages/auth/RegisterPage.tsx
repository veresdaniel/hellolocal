// src/pages/auth/RegisterPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../../app/config";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    bio: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    if (value && !emailRegex.test(value)) {
      setEmailError(t("admin.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    if (value && value.length < 6) {
      setPasswordError(t("admin.passwordTooShort"));
    } else {
      setPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate email and password before submitting
    if (!emailRegex.test(formData.email)) {
      setEmailError(t("admin.invalidEmail"));
      return;
    }
    if (formData.password.length < 6) {
      setPasswordError(t("admin.passwordTooShort"));
      return;
    }
    
    setIsLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio || undefined,
      });
      navigate(`/${lang}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          maxWidth: 500, 
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
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.register")}
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "clamp(20px, 4vw, 32px)",
            fontSize: "clamp(13px, 3vw, 14px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 400,
          }}
        >
          {t("admin.createAccount")}
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
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#667eea",
              fontWeight: 600,
              fontSize: "clamp(13px, 3vw, 14px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.username")}
          </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
              transition: "all 0.3s ease",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              boxSizing: "border-box",
            }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: emailError ? "#dc2626" : "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
              }}
            >
              {t("admin.email")}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: `2px solid ${emailError ? "#fca5a5" : "#e0e7ff"}`,
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            <p style={{ marginTop: 6, fontSize: "clamp(11px, 2.5vw, 12px)", color: "#dc2626", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {emailError}
            </p>
            )}
          </div>

          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: passwordError ? "#dc2626" : "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
              }}
            >
              {t("admin.password")}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
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
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            <p style={{ marginTop: 6, fontSize: "clamp(11px, 2.5vw, 12px)", color: "#dc2626", fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {passwordError}
            </p>
            )}
          </div>

          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
              }}
            >
              {t("admin.firstName")}
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
              transition: "all 0.3s ease",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              boxSizing: "border-box",
            }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
              }}
            >
              {t("admin.lastName")}
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
              transition: "all 0.3s ease",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              boxSizing: "border-box",
            }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label 
              style={{ 
                display: "block", 
                marginBottom: 8,
                color: "#667eea",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
              }}
            >
              {t("admin.bioOptional")}
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                resize: "vertical",
                minHeight: 80,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)",
            fontSize: "clamp(15px, 3.5vw, 16px)",
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            background: isLoading ? "#a5b4fc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            {isLoading ? t("admin.registering") : t("admin.register")}
          </button>
        </form>

        {/* Divider */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          margin: "clamp(20px, 4vw, 24px) 0",
          gap: 12,
        }}>
          <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
          <span style={{ 
            fontSize: "clamp(12px, 2.5vw, 14px)", 
            color: "#666",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {t("admin.or") || "vagy"}
          </span>
          <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
        </div>

        {/* Google OAuth Button */}
        <a
          key="google-register-button"
          href={`/api/auth/google`}
          style={{
            width: "100%",
            padding: "clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)",
            fontSize: "clamp(15px, 3.5vw, 16px)",
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            background: "white",
            color: "#1a1a1a",
            border: "2px solid #e0e0e0",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            boxSizing: "border-box",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            visibility: "visible",
            opacity: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#4285f4";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(66, 133, 244, 0.2)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0e0e0";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{t("admin.registerWithGoogle") || "Regisztráció Google-lal"}</span>
        </a>

        <div style={{ marginTop: "clamp(20px, 4vw, 24px)", textAlign: "center", fontSize: "clamp(13px, 3vw, 14px)", color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 400 }}>
          {t("admin.alreadyHaveAccount")}{" "}
          <Link 
            to={`/${lang}/admin/login`} 
            style={{ 
              color: "#667eea",
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            {t("admin.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}

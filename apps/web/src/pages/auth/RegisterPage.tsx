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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
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
              <p style={{ marginTop: 6, fontSize: "clamp(11px, 2.5vw, 12px)", color: "#dc2626", fontWeight: 500 }}>
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
              style={{ 
                width: "100%", 
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(14px, 3.5vw, 15px)",
                border: `2px solid ${passwordError ? "#fca5a5" : "#e0e7ff"}`,
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily: "inherit",
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
              <p style={{ marginTop: 6, fontSize: "clamp(11px, 2.5vw, 12px)", color: "#dc2626", fontWeight: 500 }}>
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
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

        <div style={{ marginTop: "clamp(20px, 4vw, 24px)", textAlign: "center", fontSize: "clamp(13px, 3vw, 14px)", color: "#666" }}>
          {t("admin.alreadyHaveAccount")}{" "}
          <Link 
            to={`/${lang}/admin/login`} 
            style={{ 
              color: "#667eea",
              fontWeight: 600,
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

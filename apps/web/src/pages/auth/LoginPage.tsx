// src/pages/auth/LoginPage.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, HAS_MULTIPLE_TENANTS, DEFAULT_TENANT_SLUG, type Lang } from "../../app/config";
import { buildPath } from "../../app/routing/buildPath";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wasManualLogout, setWasManualLogout] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const twoFactorInputRef = useRef<HTMLInputElement>(null);
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();

  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate email on change
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !emailRegex.test(value)) {
      setEmailError(t("admin.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  // Check if user was manually logged out or session expired
  useEffect(() => {
    const manualLogoutFlag = sessionStorage.getItem("wasManualLogout");
    const sessionExpiredFlag = sessionStorage.getItem("sessionExpired");
    
    if (manualLogoutFlag === "true") {
      setWasManualLogout(true);
      sessionStorage.removeItem("wasManualLogout");
    }
    
    if (sessionExpiredFlag === "true") {
      setError(t("admin.sessionExpired") || "Session expired. Please login again.");
      sessionStorage.removeItem("sessionExpired");
    }
  }, [t]);

  // Sync i18n language with URL parameter
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
    }
  }, [lang, i18n]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate email before submitting
    if (!emailRegex.test(email)) {
      setEmailError(t("admin.invalidEmail"));
      return;
    }
    
    setIsLoading(true);

    try {
      await login(email, password, requiresTwoFactor ? twoFactorToken : undefined);
      // Navigate after login completes - React will re-render when AuthContext updates
      navigate(`/${lang}/admin`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("admin.loginFailed");
      const errorStatus = (err as any)?.status;
      
      // Check if error indicates 2FA is required
      // The backend returns 400 with message: "2FA verification required. Please provide a 2FA token."
      const lowerMessage = errorMessage.toLowerCase();
      const is2FARequired = 
        errorStatus === 400 &&
        (lowerMessage.includes("2fa") ||
         lowerMessage.includes("two-factor") ||
         lowerMessage.includes("twofactor") ||
         lowerMessage.includes("verification required"));
      
      if (is2FARequired) {
        setRequiresTwoFactor(true);
        setError(t("admin.pleaseEnter2FACode"));
        // Focus will be set by useEffect when requiresTwoFactor changes
      } else {
        setError(errorMessage);
        // Reset 2FA requirement if it's a different error
        if (requiresTwoFactor) {
          setRequiresTwoFactor(false);
          setTwoFactorToken("");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-focus 2FA input when it becomes visible
  useEffect(() => {
    if (requiresTwoFactor && twoFactorInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        twoFactorInputRef.current?.focus();
      }, 100);
    }
  }, [requiresTwoFactor]);

  // Build public page path
  const publicPagePath = buildPath({ 
    tenantSlug: DEFAULT_TENANT_SLUG, 
    lang, 
    path: "" 
  });

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
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {t("admin.login")}
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
          {t("admin.loginDescription")}
        </p>

      {wasManualLogout && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: "clamp(16px, 4vw, 24px)",
            background: "linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)",
            color: "#5b21b6",
            borderRadius: 12,
            border: "1px solid #c4b5fd",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(14px, 3.5vw, 16px)", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <span style={{ fontSize: "clamp(16px, 4vw, 18px)" }}>✓</span>
            <span style={{ fontWeight: 500 }}>{t("admin.loggedOutSuccessfully")}</span>
          </div>
          <Link
            to={publicPagePath}
            style={{
              padding: "clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)",
              background: "#667eea",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              fontSize: "clamp(13px, 3vw, 14px)",
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textAlign: "center",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#5568d3";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#667eea";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}>🌐</span>
            <span>{t("admin.openPublicPage")}</span>
          </Link>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: "clamp(16px, 4vw, 24px)",
            background: requiresTwoFactor ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: requiresTwoFactor ? "#92400e" : "#991b1b",
            borderRadius: 12,
            border: requiresTwoFactor ? "1px solid #fcd34d" : "1px solid #fca5a5",
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
              color: emailError ? "#dc2626" : "#667eea",
              fontWeight: 600,
              fontSize: "clamp(13px, 3vw, 14px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            required
            pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
            title={t("admin.enterValidEmail")}
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
              color: "#667eea",
              fontWeight: 600,
              fontSize: "clamp(13px, 3vw, 14px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {requiresTwoFactor && (
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
              {t("admin.twoFactorCode")}
            </label>
            <input
              ref={twoFactorInputRef}
              type="text"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: "clamp(16px, 4vw, 18px)",
                textAlign: "center",
                letterSpacing: "clamp(4px, 1.5vw, 8px)",
                fontFamily: "monospace",
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
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
            <p style={{ marginTop: 8, fontSize: "clamp(11px, 2.5vw, 12px)", color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 400 }}>
              {t("admin.enter2FACodeDescription")}
            </p>
          </div>
        )}

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
          {isLoading ? t("admin.loggingIn") : t("admin.login")}
        </button>
      </form>

      <div style={{ marginTop: "clamp(20px, 4vw, 24px)", textAlign: "center" }}>
        <Link 
          to={`/${lang}/admin/forgot-password`} 
          style={{ 
            color: "#667eea",
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          {t("admin.forgotPassword")}
        </Link>
      </div>

      <div style={{ marginTop: "clamp(12px, 3vw, 16px)", textAlign: "center", fontSize: "clamp(13px, 3vw, 14px)", color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: 400 }}>
        {t("admin.dontHaveAccount")}{" "}
        <Link 
          to={`/${lang}/admin/register`} 
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
          {t("admin.register")}
        </Link>
      </div>
      </div>
    </div>
  );
}



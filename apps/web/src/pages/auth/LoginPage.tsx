// src/pages/auth/LoginPage.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, HAS_MULTIPLE_SITES, DEFAULT_SITE_SLUG, type Lang } from "../../app/config";
import { buildUrl } from "../../app/urls";
import { ROLE_VIEWER } from "../../types/enums";

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
  const { login, user, isLoading: authIsLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Store return URL when login page is accessed from public pages
  useEffect(() => {
    // If we're coming to login page from a public page, store the return URL
    const referrer = document.referrer;
    const currentPath = window.location.pathname;
    
    // Only store if we're coming from a public page (not from admin or login itself)
    if (referrer && !referrer.includes('/admin') && !referrer.includes('/login')) {
      try {
        const referrerUrl = new URL(referrer);
        // Only store if it's the same origin
        if (referrerUrl.origin === window.location.origin) {
          sessionStorage.setItem("authReturnUrl", referrerUrl.pathname + referrerUrl.search + referrerUrl.hash);
        }
      } catch (e) {
        // If referrer is not a valid URL, ignore
      }
    }
  }, []);

  // Handle Google OAuth callback - must be before redirect check
  useEffect(() => {
    const googleAuth = searchParams.get("googleAuth");
    const tokensParam = searchParams.get("tokens");
    const errorParam = searchParams.get("error");

    if (googleAuth === "success" && tokensParam) {
      const processGoogleAuth = async () => {
        try {
          const tokens = JSON.parse(decodeURIComponent(tokensParam));
          
          // Store tokens and user data
          localStorage.setItem("accessToken", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
          localStorage.setItem("user", JSON.stringify(tokens.user));
          
          // Clear URL params immediately
          setSearchParams({});
          
          // Trigger both custom event and direct refresh
          window.dispatchEvent(new Event("auth:storage-update"));
          
          // Also refresh AuthContext user data directly
          await refreshUser();
          
          // Redirect will happen automatically via the redirect effect below
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process Google authentication");
          setSearchParams({});
        }
      };
      
      processGoogleAuth();
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refreshUser]);

  // Redirect if already logged in (after auth state is updated)
  useEffect(() => {
    if (!authIsLoading && user) {
      // Check if user is viewer - viewers should not access admin
      if (user.role === ROLE_VIEWER) {
        // Get return URL from sessionStorage or use home page
        const returnUrl = sessionStorage.getItem("authReturnUrl") || `/${lang}`;
        sessionStorage.removeItem("authReturnUrl");
        
        // If we're already on the return URL (public page), don't navigate - just update state
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath === returnUrl || currentPath === returnUrl + '/') {
          // Already on the target page, no need to navigate
          return;
        }
        
        // Use replace to avoid adding to history
        navigate(returnUrl, { replace: true });
        return;
      }
      
      // Check if user is visitor (no activeSiteId) - should not access admin
      if (!user.activeSiteId) {
        const returnUrl = sessionStorage.getItem("authReturnUrl") || `/${lang}`;
        sessionStorage.removeItem("authReturnUrl");
        
        // If we're already on the return URL (public page), don't navigate
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath === returnUrl || currentPath === returnUrl + '/') {
          return;
        }
        
        navigate(returnUrl, { replace: true });
        return;
      }
      
      // For admin/editor/superadmin, check if we have a return URL
      const returnUrl = sessionStorage.getItem("authReturnUrl");
      if (returnUrl && !returnUrl.includes("/admin/login")) {
        // If return URL is a public page, go there
        if (!returnUrl.includes("/admin")) {
          sessionStorage.removeItem("authReturnUrl");
          
          // If we're already on the return URL, don't navigate
          const currentPath = window.location.pathname + window.location.search + window.location.hash;
          if (currentPath === returnUrl || currentPath === returnUrl + '/') {
            return;
          }
          
          navigate(returnUrl, { replace: true });
          return;
        }
      }
      
      // Default: redirect to admin dashboard for non-viewer users
      // Only navigate if we're not already on admin dashboard
      const currentPath = window.location.pathname;
      if (currentPath !== `/${lang}/admin` && currentPath !== `/${lang}/admin/`) {
        navigate(`/${lang}/admin`, { replace: true });
      }
    }
  }, [user, authIsLoading, navigate, lang]);

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
  const publicPagePath = buildUrl({
    siteKey: DEFAULT_SITE_SLUG,
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
            autoComplete="username"
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
            autoComplete="current-password"
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
        key="google-login-button"
        href={`/api/auth/google`}
        onClick={(e) => {
          // Store current location as return URL before redirecting to Google OAuth
          const currentPath = window.location.pathname + window.location.search + window.location.hash;
          // Only store if we're coming from a public page (not from admin or login itself)
          if (!currentPath.includes('/admin') && !currentPath.includes('/login')) {
            sessionStorage.setItem("authReturnUrl", currentPath);
          } else {
            // If we're on login page, try to get referrer
            const referrer = document.referrer;
            if (referrer && !referrer.includes('/admin') && !referrer.includes('/login')) {
              try {
                const referrerUrl = new URL(referrer);
                if (referrerUrl.origin === window.location.origin) {
                  sessionStorage.setItem("authReturnUrl", referrerUrl.pathname + referrerUrl.search + referrerUrl.hash);
                }
              } catch (e) {
                // Ignore if referrer is not a valid URL
              }
            }
          }
        }}
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
        <span>{t("admin.loginWithGoogle") || "Bejelentkezés Google-lal"}</span>
      </a>

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



// src/pages/auth/RegisterPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {  DEFAULT_LANG, type Lang, isLang} from "../../app/config";
import { useSeo } from "../../seo/useSeo";
import { publicFormErrorMessage, usePublicFormShield } from "../../components/PublicFormShield";
import { usernameAvailable } from "../../api/auth.api";
import { isVisitorAuthPath, visitorAuthPath } from "../../auth/visitorAuth";
import { passwordProblem, passwordStrength } from "../../auth/passwordStrength";
import { safeInternalPath } from "../../utils/safeInternalPath";
import { getSignupDeviceHash } from "../../utils/signupDeviceHash";
import { FreeTrialCardVerify } from "../../components/FreeTrialCardVerify";
import { getFreeTrialCardStatus } from "../../api/signupAbuse.api";

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
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [needCard, setNeedCard] = useState(false);
  const { register } = useAuth();
  const shield = usePublicFormShield("register");
  const navigate = useNavigate();
  const location = useLocation();
  const visitor = isVisitorAuthPath(location.pathname);
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();

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
    title: visitor ? t("public.visitorAuth.register") : t("admin.register") || "Register",
    description: "",
    robots: "noindex, nofollow",
  });

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
    if (!visitor) {
      setPasswordError(value && value.length < 6 ? t("admin.passwordTooShort") : null);
      return;
    }
    const problem = passwordProblem(value);
    setPasswordError(
      !value || !problem
        ? null
        : problem === "short"
          ? t("public.visitorAuth.passwordShort")
          : t("public.visitorAuth.passwordWeak")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email and password before submitting
    if (!emailRegex.test(formData.email)) {
      setEmailError(t("admin.invalidEmail"));
      return;
    }
    const username = formData.username.trim();
    if (visitor && !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      setUsernameError(t("public.visitorAuth.usernameInvalid"));
      return;
    }
    if (!visitor && username.length < 3) {
      setUsernameError(t("public.visitorAuth.usernameInvalid"));
      return;
    }

    if (visitor) {
      const problem = passwordProblem(formData.password);
      if (problem) {
        setPasswordError(
          problem === "short"
            ? t("public.visitorAuth.passwordShort")
            : t("public.visitorAuth.passwordWeak")
        );
        return;
      }
    } else if (formData.password.length < 6) {
      setPasswordError(t("admin.passwordTooShort"));
      return;
    }

    setIsLoading(true);

    try {
      if (visitor) {
        const taken = await usernameAvailable(username);
        if (!taken.available) {
          setUsernameError(t("public.visitorAuth.usernameTaken"));
          return;
        }
      }
      await register({
        username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: visitor ? undefined : formData.bio || undefined,
        audience: visitor ? "visitor" : undefined,
        deviceHash: getSignupDeviceHash(),
        ...(await shield.payload()),
      });
      if (visitor) {
        setRegistered(true);
        return;
      }
      try {
        const card = await getFreeTrialCardStatus();
        if (card.requireCard && !card.cardVerified) {
          setNeedCard(true);
          return;
        }
      } catch {
        /* card gate optional when endpoint unavailable */
      }
      navigate(`/${lang}/admin`);
    } catch (err) {
      setError(publicFormErrorMessage(t, err, t("admin.registrationFailed")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === "username") setUsernameError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUsernameBlur = async (value: string) => {
    if (!visitor) return;
    const username = value.trim();
    if (!username) return;
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      setUsernameError(t("public.visitorAuth.usernameInvalid"));
      return;
    }
    try {
      const taken = await usernameAvailable(username);
      setUsernameError(taken.available ? null : t("public.visitorAuth.usernameTaken"));
    } catch {
      setUsernameError(null);
    }
  };

  if (needCard) {
    return (
      <div className="admin-login">
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
          <FreeTrialCardVerify
            onVerified={() => navigate(`/${lang}/admin`)}
          />
          <button
            type="button"
            onClick={() => navigate(`/${lang}/admin`)}
            style={{
              marginTop: 12,
              background: "transparent",
              border: "none",
              color: "#665d78",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("admin.signupAbuse.cardLater")}
          </button>
        </div>
      </div>
    );
  }

  if (registered) {
    const next = safeInternalPath(sessionStorage.getItem("authReturnUrl"), `/${lang}`);
    return (
      <div className="admin-login">
        <div
          style={{
            maxWidth: 500,
            width: "100%",
            background: "white",
            borderRadius: 16,
            padding: "clamp(24px, 5vw, 40px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginBottom: 12, color: "#1b1730", fontSize: 28 }}>
            {t("public.visitorAuth.successTitle")}
          </h1>
          <p style={{ color: "#665d78", marginBottom: 24 }}>{t("public.visitorAuth.successBody")}</p>
          <button
            type="button"
            onClick={() => navigate(next)}
            style={{
              padding: "12px 24px",
              background: "#1b1730",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("public.visitorAuth.continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-login"
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
            color: "#1b1730",
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 700,
            fontFamily:
              "var(--admin-font-display)",
          }}
        >
          {visitor ? t("public.visitorAuth.register") : t("admin.register")}
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
          {visitor ? t("public.visitorAuth.registerLead") : t("admin.createAccount")}
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

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)", position: "relative" }}
        >
          {shield.fields}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: usernameError ? "#dc2626" : "#1b1730",
                fontWeight: 600,
                fontSize: "clamp(13px, 3vw, 14px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("admin.username")}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              required
              minLength={3}
              maxLength={50}
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: 16,
                border: usernameError ? "2px solid #dc2626" : "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1b1730";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = usernameError ? "#dc2626" : "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
                void handleUsernameBlur(e.currentTarget.value);
              }}
            />
            {usernameError && (
              <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{usernameError}</div>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: emailError ? "#dc2626" : "#1b1730",
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
              autoComplete="username"
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: 16,
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
                  e.currentTarget.style.borderColor = "#1b1730";
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

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: passwordError ? "#dc2626" : "#1b1730",
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
              minLength={visitor ? 8 : 6}
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                fontSize: 16,
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
                  e.currentTarget.style.borderColor = "#1b1730";
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
            {visitor && formData.password && (
              <p style={{ marginTop: 6, fontSize: 12, color: "#665d78" }}>
                {t("public.visitorAuth.strength")}:{" "}
                {passwordStrength(formData.password) === "strong"
                  ? t("public.visitorAuth.strengthStrong")
                  : passwordStrength(formData.password) === "ok"
                    ? t("public.visitorAuth.strengthOk")
                    : t("public.visitorAuth.strengthWeak")}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#1b1730",
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
                fontSize: 16,
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1b1730";
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
                color: "#1b1730",
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
                fontSize: 16,
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1b1730";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {!visitor && <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#1b1730",
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
                fontSize: 16,
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                outline: "none",
                transition: "all 0.3s ease",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                resize: "vertical",
                minHeight: 80,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1b1730";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e7ff";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>}

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
                : "#1b1730",
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

        <div
          style={{
            marginTop: "clamp(20px, 4vw, 24px)",
            textAlign: "center",
            fontSize: "clamp(13px, 3vw, 14px)",
            color: "#666",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 400,
          }}
        >
          {t("admin.alreadyHaveAccount")}{" "}
          <Link
            to={visitor ? visitorAuthPath(lang, "login") : `/${lang}/admin/login`}
            style={{
              color: "#1b1730",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            {visitor ? t("public.visitorAuth.login") : t("admin.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}

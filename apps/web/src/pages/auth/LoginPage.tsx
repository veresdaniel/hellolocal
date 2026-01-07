// src/pages/auth/LoginPage.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const twoFactorInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, requiresTwoFactor ? twoFactorToken : undefined);
      navigate("/admin");
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

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>{t("admin.login")}</h1>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: requiresTwoFactor ? "#fff3cd" : "#fee",
            color: requiresTwoFactor ? "#856404" : "#c00",
            borderRadius: 4,
            border: requiresTwoFactor ? "1px solid #ffc107" : "1px solid #fcc",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>{t("admin.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>{t("admin.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </div>

        {requiresTwoFactor && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{t("admin.twoFactorCode")}</label>
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
                padding: 8,
                fontSize: 16,
                textAlign: "center",
                letterSpacing: 4,
                fontFamily: "monospace",
              }}
            />
            <p style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
              {t("admin.enter2FACodeDescription")}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? t("admin.loggingIn") : t("admin.login")}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/admin/forgot-password" style={{ color: "#007bff" }}>
          {t("admin.forgotPassword")}
        </Link>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        {t("admin.dontHaveAccount")} <Link to="/admin/register" style={{ color: "#007bff" }}>{t("admin.register")}</Link>
      </div>
    </div>
  );
}


import { useId, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  passwordProblem,
  passwordStrength,
  passwordStrengthScore,
  PASSWORD_MIN_LENGTH,
} from "../auth/passwordStrength";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
  /** Show strength meter under the input (default true). */
  showStrength?: boolean;
  /** Compact styles for admin forms. */
  compact?: boolean;
  inputStyle?: CSSProperties;
};

const STRENGTH_COLORS = ["#e5e7eb", "#dc2626", "#d97706", "#16a34a"] as const;

export function PasswordField({
  value,
  onChange,
  label,
  name = "password",
  autoComplete = "new-password",
  required = true,
  error,
  showStrength = true,
  compact = false,
  inputStyle,
}: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const score = passwordStrengthScore(value);
  const strength = passwordStrength(value);
  const problem = value ? passwordProblem(value) : null;

  const pad = compact ? 8 : "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)";
  const radius = compact ? 4 : 8;

  return (
    <div>
      <label
        htmlFor={inputId}
        style={{
          display: "block",
          marginBottom: compact ? 4 : 8,
          color: error ? "#dc2626" : compact ? undefined : "#1b1730",
          fontWeight: compact ? 400 : 600,
          fontSize: compact ? undefined : "clamp(13px, 3vw, 14px)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            padding: pad,
            paddingRight: 48,
            fontSize: 16,
            border: error
              ? compact
                ? "1px solid #dc3545"
                : "2px solid #fca5a5"
              : compact
                ? "1px solid #ddd"
                : "2px solid #e0e7ff",
            borderRadius: radius,
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: error && !compact ? "#fef2f2" : "white",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            ...inputStyle,
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("admin.hidePassword") : t("admin.showPassword")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "#665d78",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            padding: "4px 6px",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {visible ? t("admin.hidePassword") : t("admin.showPassword")}
        </button>
      </div>
      {error ? (
        <p
          style={{
            marginTop: 6,
            fontSize: compact ? "clamp(13px, 3vw, 15px)" : "clamp(11px, 2.5vw, 12px)",
            color: "#dc2626",
            fontWeight: 500,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {error}
        </p>
      ) : null}
      {showStrength && value ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: score >= i ? STRENGTH_COLORS[score] : STRENGTH_COLORS[0],
                }}
              />
            ))}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#665d78",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("public.visitorAuth.strength")}:{" "}
            {strength === "strong"
              ? t("public.visitorAuth.strengthStrong")
              : strength === "ok"
                ? t("public.visitorAuth.strengthOk")
                : t("public.visitorAuth.strengthWeak")}
            {problem ? ` — ${t("public.visitorAuth.passwordRules")}` : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

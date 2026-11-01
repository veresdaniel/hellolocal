/**
 * Domain input component with checkbox
 * - Checkbox to enable/disable custom domain
 * - Input is disabled when checkbox is unchecked
 * - Includes placeholder with explanation
 */

import React, { useId } from "react";
import { useTranslation } from "react-i18next";

export interface DomainInputProps {
  value: string;
  onChange: (value: string) => void;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  style?: React.CSSProperties;
  required?: boolean;
}

export function DomainInput({
  value,
  onChange,
  checked,
  onCheckedChange,
  label,
  placeholder,
  error,
  style,
  required = false,
}: DomainInputProps) {
  const { t } = useTranslation();
  const hasError = !!error;
  const reactId = useId();
  const checkboxId = `${reactId}-domain-checkbox`;
  const inputId = `${reactId}-domain-input`;
  const errorId = `${reactId}-domain-error`;
  const hintId = `${reactId}-domain-hint`;
  const fieldLabel = label || t("admin.domainInput.label") || "Custom domain";

  const defaultPlaceholder =
    t("admin.domainInput.placeholder") || "example.com (opcionális egyedi domain)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            cursor: "pointer",
            accentColor: "#667eea",
          }}
        />
        <label
          htmlFor={checkboxId}
          style={{
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "#374151",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            userSelect: "none",
          }}
        >
          {fieldLabel}
        </label>
      </div>
      <label htmlFor={inputId} className="hl-visually-hidden">
        {fieldLabel}
      </label>
      <input
        id={inputId}
        type="text"
        value={checked ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!checked}
        placeholder={checked ? placeholder || defaultPlaceholder : defaultPlaceholder}
        required={required && checked}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError ? errorId : !checked ? hintId : undefined
        }
        style={{
          width: "100%",
          padding: "10px 14px",
          border: hasError ? "1px solid #dc3545" : "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: checked ? "white" : "#f3f4f6",
          color: checked ? "#111827" : "#9ca3af",
          cursor: checked ? "text" : "not-allowed",
          transition: "all 0.2s ease",
          ...style,
        }}
        onFocus={(e) => {
          if (checked && !hasError) {
            e.currentTarget.style.borderColor = "#667eea";
          }
        }}
        onBlur={(e) => {
          if (checked && !hasError) {
            e.currentTarget.style.borderColor = "#d1d5db";
          }
        }}
      />
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{
            color: "#dc3545",
            fontSize: 12,
            marginTop: 6,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {error}
        </div>
      )}
      {!error && !checked && (
        <div
          id={hintId}
          style={{
            color: "#6b7280",
            fontSize: 12,
            marginTop: 4,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontStyle: "italic",
          }}
        >
          {t("admin.domainInput.disabledHint") ||
            "Kapcsold be a checkbox-ot az egyedi domain megadásához"}
        </div>
      )}
    </div>
  );
}

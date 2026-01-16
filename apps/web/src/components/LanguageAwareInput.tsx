/**
 * Reusable language-aware input component
 * Reduces code duplication across admin forms
 */

import React from "react";
import type { Lang } from "../types/enums";
import { getLangFieldValue, getLangFieldError, hasLangFieldError } from "../utils/langHelpers";

export interface LanguageAwareInputProps {
  field: string;
  lang: Lang;
  values: Record<string, string>;
  errors?: Record<string, string>;
  onChange: (lang: Lang, value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "textarea" | "email" | "url";
  rows?: number;
  style?: React.CSSProperties;
}

export function LanguageAwareInput({
  field,
  lang,
  values,
  errors = {},
  onChange,
  label,
  placeholder,
  required = false,
  type = "text",
  rows = 4,
  style,
}: LanguageAwareInputProps) {
  const value = getLangFieldValue(values, field, lang);
  const error = getLangFieldError(errors, field, lang);
  const hasError = hasLangFieldError(errors, field, lang);

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: hasError ? "1px solid #dc3545" : "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "clamp(14px, 3.5vw, 16px)",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    ...style,
  };

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: hasError ? 600 : 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: hasError ? "#dc2626" : "#374151",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {label} ({lang.toUpperCase()}){required && " *"}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(lang, e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          style={baseStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(lang, e.target.value)}
          placeholder={placeholder}
          required={required}
          style={baseStyle}
        />
      )}
      {error && <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

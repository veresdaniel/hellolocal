import type { CSSProperties } from "react";

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: "clamp(15px, 3.5vw, 16px)",
  fontWeight: 600,
  color: "var(--admin-ink, #0f172a)",
  fontFamily: "var(--admin-font)",
};

const helpStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "var(--admin-muted-strong, #334155)",
  fontSize: 15,
  lineHeight: 1.5,
  fontFamily: "var(--admin-font)",
};

type GtmContainerFieldProps = {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint: string;
  disabled?: boolean;
  /** Compact inline input for domain rows. */
  compact?: boolean;
};

/** Google Tag Manager container ID (GTM-…). Replaces the old GA4 measurement field. */
export function GtmContainerField({
  label,
  help,
  value,
  onChange,
  error,
  hint,
  disabled,
  compact,
}: GtmContainerFieldProps) {
  return (
    <div style={{ marginBottom: compact ? 0 : 16 }}>
      {compact ? null : <label style={labelStyle}>{label}</label>}
      {help && !compact ? <p style={helpStyle}>{help}</p> : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="GTM-XXXXXXX"
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        style={{
          display: "block",
          width: compact ? "100%" : undefined,
          flex: compact ? undefined : "1 1 240px",
          minWidth: compact ? 140 : 0,
          minHeight: compact ? 42 : undefined,
          padding: compact ? "0 12px" : 12,
          fontSize: 16,
          color: "var(--admin-ink, #0f172a)",
          background: disabled ? "#f8fafc" : "#fff",
          border: error ? "1px solid #dc2626" : "1px solid #ddd",
          borderRadius: compact ? 8 : 4,
          fontFamily: "var(--admin-font)",
          boxSizing: "border-box",
        }}
      />
      {compact && !error ? null : (
        <p
          style={{
            margin: "8px 0 0",
            color: error ? "#991b1b" : "var(--admin-muted-strong, #334155)",
            fontSize: 15,
            lineHeight: 1.45,
            fontFamily: "var(--admin-font)",
          }}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

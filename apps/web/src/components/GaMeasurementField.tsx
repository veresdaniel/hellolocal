import type { CSSProperties } from "react";
import { GaConsoleLink } from "./GaConsoleLink";

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

type GaMeasurementFieldProps = {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint: string;
  disabled?: boolean;
};

/** Same label, type size, and contrast as the other admin form fields. */
export function GaMeasurementField({
  label,
  help,
  value,
  onChange,
  error,
  hint,
  disabled,
}: GaMeasurementFieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {help ? <p style={helpStyle}>{help}</p> : null}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="G-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          style={{
            flex: "1 1 240px",
            minWidth: 0,
            padding: 12,
            fontSize: 16,
            color: "var(--admin-ink, #0f172a)",
            background: disabled ? "#f8fafc" : "#fff",
            border: error ? "1px solid #dc2626" : "1px solid #ddd",
            borderRadius: 4,
            fontFamily: "var(--admin-font)",
          }}
        />
        <GaConsoleLink measurementId={value} />
      </div>
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
    </div>
  );
}

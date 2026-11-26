/** Shared mobile-first styles for the place/event wizard. */
import type { CSSProperties } from "react";

export const wizardPage: CSSProperties = {
  maxWidth: 480,
  width: "100%",
  margin: "0 auto",
  padding: "12px 16px 96px",
  fontFamily: "var(--admin-font, system-ui, sans-serif)",
  color: "rgba(255,255,255,0.95)",
  boxSizing: "border-box",
  overflowX: "hidden",
};

export const wizardCard: CSSProperties = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: 14,
  border: "1px solid rgba(27,23,48,0.12)",
  padding: "18px 16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  color: "var(--admin-primary, #1b1730)",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
};

export const wizardLabel: CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 8,
  color: "var(--admin-primary, #1b1730)",
};

export const wizardInput: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  fontSize: 16, // ≥16 prevents iOS focus zoom
  padding: "14px 12px",
  borderRadius: 10,
  border: "2px solid rgba(27,23,48,0.18)",
  background: "#fff",
  color: "var(--admin-primary, #1b1730)",
  fontFamily: "inherit",
};

export const wizardTextarea: CSSProperties = {
  ...wizardInput,
  minHeight: 120,
  resize: "vertical" as const,
  lineHeight: 1.45,
};

export const wizardSelect: CSSProperties = {
  ...wizardInput,
  appearance: "auto" as const,
};

export const wizardPrimaryBtn: CSSProperties = {
  flex: 1,
  minHeight: 48,
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 12,
  border: "none",
  background: "var(--admin-primary, #1b1730)",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "12px 16px",
};

export const wizardSecondaryBtn: CSSProperties = {
  ...wizardPrimaryBtn,
  background: "transparent",
  color: "var(--admin-primary, #1b1730)",
  border: "2px solid rgba(27,23,48,0.25)",
};

export const wizardFooter: CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 480,
  bottom: 0,
  display: "flex",
  gap: 10,
  padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
  background: "rgba(255,255,255,0.94)",
  borderTop: "1px solid rgba(27,23,48,0.1)",
  boxSizing: "border-box",
  zIndex: 20,
};

export function plainToHtml(text: string): string {
  const escaped = text
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!escaped) return "";
  return `<p>${escaped.replace(/\n+/g, "</p><p>")}</p>`;
}

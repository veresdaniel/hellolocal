/**
 * Rare inline style helpers for admin — prefer CSS classes in admin-surfaces.css.
 * Use these only when className is awkward (dynamic layout math, one-off overrides).
 */
import type { CSSProperties } from "react";

export const adminVar = {
  bg: "var(--admin-bg)",
  bgSolid: "var(--admin-bg-solid)",
  surface: "var(--admin-surface)",
  surfaceSubtle: "var(--admin-surface-subtle)",
  ink: "var(--admin-ink)",
  muted: "var(--admin-muted)",
  mutedStrong: "var(--admin-muted-strong)",
  border: "var(--admin-border)",
  borderSubtle: "var(--admin-border-subtle)",
  primary: "var(--admin-primary)",
  primaryHover: "var(--admin-primary-hover)",
  primarySoft: "var(--admin-primary-soft)",
  primaryBorder: "var(--admin-primary-border)",
  onPrimary: "var(--admin-on-primary)",
  accent: "var(--admin-accent)",
  link: "var(--admin-link)",
  danger: "var(--admin-danger)",
  success: "var(--admin-success)",
  warning: "var(--admin-warning)",
  font: "var(--admin-font)",
  fontDisplay: "var(--admin-font-display)",
  radius: "var(--admin-radius)",
  shadow: "var(--admin-shadow)",
} as const;

/** Prefer .admin-section-card; kept for gradual migration of style={{...}} blocks. */
export const adminSectionCardStyle: CSSProperties = {
  background: adminVar.surface,
  color: adminVar.ink,
  border: `1px solid ${adminVar.borderSubtle}`,
  borderRadius: adminVar.radius,
  boxShadow: adminVar.shadow,
  padding: 24,
  boxSizing: "border-box",
};

export const adminFieldControlStyle: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  minHeight: 42,
  padding: "0 12px",
  border: `1px solid ${adminVar.border}`,
  borderRadius: 8,
  font: "inherit",
  color: adminVar.ink,
  background: adminVar.surface,
  boxSizing: "border-box",
};

/** Shared public theme color keys — keep in sync with apps/web/src/styles/publicThemeColors.ts */

export const PUBLIC_COLOR_KEYS = [
  "bg",
  "card",
  "accent",
  "header",
  "ink",
  "muted",
  "onDark",
  "onAccent",
] as const;

export type PublicColorKey = (typeof PUBLIC_COLOR_KEYS)[number];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalize theme payload: keep unrelated Brand.theme keys (fonts), sanitize colors.
 * Accepts `{ colors: {...} }` or a flat color map mixed into theme.
 */
export function mergeThemeWithColors(
  existingTheme: unknown,
  nextTheme: unknown
): Record<string, unknown> {
  const base =
    existingTheme && typeof existingTheme === "object" && !Array.isArray(existingTheme)
      ? { ...(existingTheme as Record<string, unknown>) }
      : {};

  if (nextTheme === null) {
    delete base.colors;
    return base;
  }

  if (!nextTheme || typeof nextTheme !== "object" || Array.isArray(nextTheme)) {
    throw new Error("Theme must be an object");
  }

  const incoming = nextTheme as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base, ...incoming };

  const colorSource =
    incoming.colors && typeof incoming.colors === "object" && !Array.isArray(incoming.colors)
      ? (incoming.colors as Record<string, unknown>)
      : incoming;

  const hasColorKey = PUBLIC_COLOR_KEYS.some((key) => colorSource[key] !== undefined);
  if (hasColorKey || incoming.colors !== undefined) {
    const colors: Record<string, string> = {};
    const prevColors =
      base.colors && typeof base.colors === "object" && !Array.isArray(base.colors)
        ? (base.colors as Record<string, unknown>)
        : {};

    for (const key of PUBLIC_COLOR_KEYS) {
      const value = colorSource[key] !== undefined ? colorSource[key] : prevColors[key];
      if (value === undefined || value === null || value === "") continue;
      if (!isValidHexColor(value)) {
        throw new Error(`Invalid hex color for ${key}`);
      }
      colors[key] = normalizeHexColor(value);
    }

    // Strip flat color keys from root so Brand.theme stays { fonts..., colors: {} }
    for (const key of PUBLIC_COLOR_KEYS) {
      delete next[key];
    }
    next.colors = colors;
  }

  return next;
}

export function sanitizeSiteTheme(input: unknown): Record<string, unknown> | null {
  if (input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Site theme must be an object");
  }
  const raw = input as Record<string, unknown>;
  const source =
    raw.colors && typeof raw.colors === "object" && !Array.isArray(raw.colors)
      ? (raw.colors as Record<string, unknown>)
      : raw;
  const colors: Record<string, string> = {};
  for (const key of PUBLIC_COLOR_KEYS) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;
    if (!isValidHexColor(value)) {
      throw new Error(`Invalid hex color for ${key}`);
    }
    colors[key] = normalizeHexColor(value);
  }
  return { colors };
}

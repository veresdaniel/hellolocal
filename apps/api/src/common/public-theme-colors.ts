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

export const PUBLIC_THEME_PRESET_IDS = ["classic", "atelier"] as const;

export type PublicThemePresetId = (typeof PUBLIC_THEME_PRESET_IDS)[number];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  return value.trim().toLowerCase();
}

export function isPublicThemePresetId(value: unknown): value is PublicThemePresetId {
  return value === "classic" || value === "atelier";
}

function sanitizePresetId(value: unknown): PublicThemePresetId | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (!isPublicThemePresetId(value)) {
    throw new Error("Invalid theme presetId. Use classic or atelier.");
  }
  return value;
}

/**
 * Normalize theme payload: keep unrelated Brand.theme keys (fonts), sanitize colors + presetId.
 * Accepts `{ colors: {...}, presetId }` or a flat color map mixed into theme.
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
    delete base.presetId;
    return base;
  }

  if (!nextTheme || typeof nextTheme !== "object" || Array.isArray(nextTheme)) {
    throw new Error("Theme must be an object");
  }

  const incoming = nextTheme as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base, ...incoming };

  if ("presetId" in incoming) {
    const presetId = sanitizePresetId(incoming.presetId);
    if (presetId) next.presetId = presetId;
    else delete next.presetId;
  }

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

    // Strip flat color keys from root so Brand.theme stays { fonts..., colors: {}, presetId }
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
  const out: Record<string, unknown> = { colors };
  const presetId = sanitizePresetId(raw.presetId);
  if (presetId) out.presetId = presetId;
  return out;
}

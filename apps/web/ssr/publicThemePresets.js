/**
 * SSR mirror of apps/web/src/styles/publicThemePresets.ts + publicThemeCssVars.
 * Keep color defaults and preset IDs in sync with the TypeScript modules.
 */

export const PUBLIC_THEME_PRESET_IDS = ["classic", "atelier"];

export const DEFAULT_PUBLIC_THEME_COLORS = {
  bg: "#1b1730",
  card: "#fffdf9",
  accent: "#c45c26",
  header: "#1b1730",
  ink: "#1b1730",
  muted: "#665d78",
  onDark: "#f2f4fb",
  onAccent: "#fffdf9",
};

export const ATELIER_PUBLIC_THEME_COLORS = {
  bg: "#f4f5f7",
  card: "#ffffff",
  accent: "#0d6e6e",
  header: "#12141a",
  ink: "#12141a",
  muted: "#5a5f6d",
  onDark: "#f2f4fb",
  onAccent: "#ffffff",
};

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function pickHex(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return HEX_RE.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function readColorsObject(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const nested =
    source.colors && typeof source.colors === "object" && !Array.isArray(source.colors)
      ? source.colors
      : source;
  return {
    bg: nested.bg ?? nested.background,
    card: nested.card ?? nested.surface,
    accent: nested.accent,
    header: nested.header ?? nested.navy,
    ink: nested.ink ?? nested.text ?? nested.inkOnCard,
    muted: nested.muted ?? nested.mutedOnCard,
    onDark: nested.onDark ?? nested.inkOnDark ?? nested.inkStrong,
    onAccent: nested.onAccent,
  };
}

function readPresetId(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const id = source.presetId;
  return id === "classic" || id === "atelier" ? id : null;
}

export function resolvePublicThemePreset(siteTheme, brandTheme) {
  return readPresetId(siteTheme) || readPresetId(brandTheme) || "classic";
}

export function resolvePublicThemeColors(siteTheme, brandTheme) {
  const presetId = resolvePublicThemePreset(siteTheme, brandTheme);
  const defaults =
    presetId === "atelier" ? ATELIER_PUBLIC_THEME_COLORS : DEFAULT_PUBLIC_THEME_COLORS;
  const brand = readColorsObject(brandTheme);
  // Legacy site color maps without presetId must not block a brand preset switch.
  const siteHasPreset =
    siteTheme &&
    typeof siteTheme === "object" &&
    !Array.isArray(siteTheme) &&
    (siteTheme.presetId === "classic" || siteTheme.presetId === "atelier");
  const site = siteHasPreset ? readColorsObject(siteTheme) : {};
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    out[key] = pickHex(site[key], pickHex(brand[key], defaults[key]));
  }
  return out;
}

function mixToward(hex, toward, amount) {
  const parse = (h) => {
    const n = h.slice(1);
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(hex);
  const [br, bg, bb] = parse(toward);
  const ch = (a, b) =>
    Math.round(a + (b - a) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

function hexToRgba(hex, alpha) {
  const n = hex.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function publicThemeCssVars(siteTheme, brandTheme) {
  const presetId = resolvePublicThemePreset(siteTheme, brandTheme);
  const c = resolvePublicThemeColors(siteTheme, brandTheme);
  const bgMid = mixToward(c.bg, presetId === "atelier" ? "#ffffff" : "#3d5a9a", 0.18);
  const bgDeep = mixToward(c.bg, "#000000", presetId === "atelier" ? 0.04 : 0.18);
  const mist = mixToward(c.onDark, "#7a92c8", 0.45);
  const blue = mixToward(c.bg, "#3d5a9a", 0.55);
  const mutedOnDark = mixToward(c.onDark, "#7a92c8", 0.35);

  const bgImage =
    presetId === "atelier"
      ? [
          `radial-gradient(900px 480px at 12% -8%, ${hexToRgba(c.accent, 0.06)}, transparent 55%)`,
          `linear-gradient(180deg, ${c.bg} 0%, ${bgMid} 48%, ${c.bg} 100%)`,
        ].join(", ")
      : [
          `radial-gradient(980px 560px at 8% -4%, ${hexToRgba(blue, 0.55)}, transparent 58%)`,
          `radial-gradient(820px 520px at 100% 8%, ${hexToRgba(mist, 0.28)}, transparent 52%)`,
          `radial-gradient(700px 480px at 70% 55%, ${hexToRgba(c.accent, 0.08)}, transparent 60%)`,
          `radial-gradient(640px 400px at 20% 90%, ${hexToRgba(blue, 0.45)}, transparent 55%)`,
          `linear-gradient(180deg, ${c.bg} 0%, ${bgMid} 38%, ${c.bg} 72%, ${bgDeep} 100%)`,
        ].join(", ");

  return {
    presetId,
    vars: {
      "--hl-bg": c.bg,
      "--hl-bg-mid": bgMid,
      "--hl-bg-deep": bgDeep,
      "--hl-card": c.card,
      "--hl-surface": c.card,
      "--hl-surface-solid": c.card,
      "--hl-ink": c.ink,
      "--hl-muted": c.muted,
      "--hl-ink-on-card": c.ink,
      "--hl-muted-on-card": c.muted,
      "--hl-on-dark": c.onDark,
      "--hl-on-dark-strong": "#ffffff",
      "--hl-ink-strong": c.onDark,
      "--hl-muted-on-dark": mutedOnDark,
      "--hl-on-accent": c.onAccent,
      "--hl-accent": c.accent,
      "--hl-header": c.header,
      "--hl-navy": c.header,
      "--hl-blue": blue,
      "--hl-mist": mist,
      "--hl-line": hexToRgba(c.onDark, 0.14),
      "--hl-line-on-card": hexToRgba(c.ink, 0.1),
      "--hl-bg-image": bgImage,
    },
  };
}

/** Inline `:root` / `html` declarations for first paint. */
export function publicThemeInlineCss(siteTheme, brandTheme) {
  const { presetId, vars } = publicThemeCssVars(siteTheme, brandTheme);
  const decls = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const pageColor = presetId === "atelier" ? vars["--hl-ink"] : vars["--hl-on-dark"];
  return {
    presetId,
    css: `:root{${decls}}html{background-color:var(--hl-bg);color:${pageColor}}body{background-color:var(--hl-bg);color:inherit}`,
  };
}

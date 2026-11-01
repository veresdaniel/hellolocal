import { useTranslation } from "react-i18next";
import {
  DEFAULT_PUBLIC_THEME_COLORS,
  PUBLIC_COLOR_KEYS,
  isValidHexColor,
  type PublicColorKey,
  type PublicThemeColors,
} from "../styles/publicThemeColors";

const LABELS: Record<PublicColorKey, string> = {
  bg: "admin.themeColors.bg",
  card: "admin.themeColors.card",
  accent: "admin.themeColors.accent",
  header: "admin.themeColors.header",
  ink: "admin.themeColors.ink",
  muted: "admin.themeColors.muted",
  onDark: "admin.themeColors.onDark",
  onAccent: "admin.themeColors.onAccent",
};

type Props = {
  value: PublicThemeColors;
  onChange: (next: PublicThemeColors) => void;
  disabled?: boolean;
  errors?: Partial<Record<PublicColorKey, string>>;
};

export function PublicThemeColorsEditor({ value, onChange, disabled, errors }: Props) {
  const { t } = useTranslation();

  const setKey = (key: PublicColorKey, raw: string) => {
    onChange({ ...value, [key]: raw });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {PUBLIC_COLOR_KEYS.map((key) => {
        const hex = value[key] || DEFAULT_PUBLIC_THEME_COLORS[key];
        const pickerValue = isValidHexColor(hex) ? hex : DEFAULT_PUBLIC_THEME_COLORS[key];
        const invalid = hex.trim() !== "" && !isValidHexColor(hex);
        return (
          <label key={key} style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{t(LABELS[key])}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={pickerValue}
                disabled={disabled}
                onChange={(e) => setKey(key, e.target.value)}
                style={{
                  width: 44,
                  height: 36,
                  padding: 0,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "white",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              />
              <input
                type="text"
                value={hex}
                disabled={disabled}
                spellCheck={false}
                autoComplete="off"
                placeholder={DEFAULT_PUBLIC_THEME_COLORS[key]}
                onChange={(e) => setKey(key, e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "8px 10px",
                  fontSize: 14,
                  borderRadius: 6,
                  border: invalid || errors?.[key] ? "1px solid #dc2626" : "1px solid #ddd",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              />
            </div>
            {(invalid || errors?.[key]) && (
              <span style={{ color: "#dc2626", fontSize: 12 }}>
                {errors?.[key] || t("admin.themeColors.invalidHex")}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

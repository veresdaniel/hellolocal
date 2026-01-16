// src/app/colors.ts
// Centralized color constants for the application

/**
 * Primary brand colors
 */
export const COLORS = {
  // Primary gradient colors (main brand)
  primary: "#667eea",
  primaryDark: "#764ba2",

  // Secondary colors
  secondary: "#764ba2",

  // Status colors
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",

  // Additional colors
  purple: "#8b5cf6",
  pink: "#ec4899",

  // Neutral colors
  gray: {
    light: "#f5f5f5",
    medium: "#666",
    dark: "#333",
  },

  // Background colors
  background: {
    white: "rgba(255, 255, 255, 0.98)",
    whiteOpaque: "rgba(255, 255, 255, 0.95)",
    whiteSemi: "rgba(255, 255, 255, 0.8)",
    light: "#f5f5f5",
  },

  // Border colors
  border: {
    light: "rgba(0, 0, 0, 0.06)",
    medium: "rgba(0, 0, 0, 0.08)",
    dark: "#e0e0e0",
  },

  // Text colors
  text: {
    primary: "#333",
    secondary: "#666",
    light: "#999",
    dark: "#2d1f3d",
  },
} as const;

/**
 * Gradient color combinations
 */
export const GRADIENTS = {
  primary: {
    start: COLORS.primary,
    end: COLORS.primaryDark,
    css: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
  },
  success: {
    start: COLORS.success,
    end: "#059669",
    css: `linear-gradient(135deg, ${COLORS.success} 0%, #059669 100%)`,
  },
  info: {
    start: COLORS.info,
    end: "#2563eb",
    css: `linear-gradient(135deg, ${COLORS.info} 0%, #2563eb 100%)`,
  },
  warning: {
    start: COLORS.warning,
    end: "#d97706",
    css: `linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%)`,
  },
} as const;

/**
 * Helper function to convert hex to rgba
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Helper function to get rgba from color string (hex or rgba)
 */
export function getRgba(color: string, opacity: number = 1): string {
  if (color.startsWith("rgba")) {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
    }
    return color;
  }

  if (color.startsWith("#")) {
    return hexToRgba(color, opacity);
  }

  return color;
}

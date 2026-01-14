// src/components/Badge.tsx
import { COLORS, getRgba } from "../app/colors";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "category" | "tag" | "priceBand" | "custom";
  color?: string; // For custom variant
  backgroundColor?: string; // For custom variant
  textColor?: string; // For custom variant
  opacity?: number; // Background opacity (0-1)
  size?: "small" | "medium" | "large";
  uppercase?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({
  children,
  variant = "tag",
  color,
  backgroundColor,
  textColor,
  opacity = 0.9,
  size = "medium",
  uppercase = false,
  className,
  style,
}: BadgeProps) {
  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: 11,
      padding: "4px 10px",
    },
    medium: {
      fontSize: "clamp(13px, 3vw, 15px)",
      padding: "6px 12px",
    },
    large: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      padding: "8px 14px",
    },
  };

  const currentSize = sizeConfig[size];

  // Variant-based styling
  let finalBackgroundColor = backgroundColor;
  let finalTextColor = textColor;
  let finalOpacity = opacity;

  if (variant === "category" && !backgroundColor) {
    // Category badge: colored background with white text (default)
    finalBackgroundColor = color || COLORS.primary;
    finalTextColor = textColor || "white";
    finalOpacity = opacity;
  } else if (variant === "category" && backgroundColor) {
    // Category badge with custom background (e.g., white background with colored text)
    finalBackgroundColor = backgroundColor;
    finalTextColor = textColor || color || COLORS.primary;
    finalOpacity = opacity;
  } else if (variant === "tag" && !backgroundColor) {
    // Tag badge: light gray background
    finalBackgroundColor = COLORS.gray.light;
    finalTextColor = textColor || COLORS.gray.medium;
    finalOpacity = 0.9;
  } else if (variant === "priceBand" && !backgroundColor) {
    // Price band badge: purple background
    finalBackgroundColor = COLORS.primaryDark;
    finalTextColor = textColor || "white";
    finalOpacity = opacity;
  } else if (variant === "custom") {
    // Custom: use provided colors
    finalBackgroundColor = backgroundColor || COLORS.gray.light;
    finalTextColor = textColor || COLORS.gray.medium;
  }

  // Convert hex to rgba if opacity is provided
  const getBackgroundColor = () => {
    if (!finalBackgroundColor) return getRgba(COLORS.gray.light, 0.9);
    return getRgba(finalBackgroundColor, finalOpacity);
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        fontSize: currentSize.fontSize,
        fontWeight: 400,
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: finalTextColor,
        background: getBackgroundColor(),
        border: variant === "tag" ? "1px solid rgba(0, 0, 0, 0.08)" : "none",
        borderRadius: 6, // Modern, less rounded
        padding: currentSize.padding,
        textTransform: uppercase ? "uppercase" : "none",
        letterSpacing: uppercase ? "0.05em" : "0",
        lineHeight: 1.4,
        wordBreak: "break-word",
        overflowWrap: "break-word",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

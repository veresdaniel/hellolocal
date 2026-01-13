// src/components/Badge.tsx
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
    finalBackgroundColor = color || "#667eea";
    finalTextColor = textColor || "white";
    finalOpacity = opacity;
  } else if (variant === "category" && backgroundColor) {
    // Category badge with custom background (e.g., white background with colored text)
    finalBackgroundColor = backgroundColor;
    finalTextColor = textColor || color || "#667eea";
    finalOpacity = opacity;
  } else if (variant === "tag" && !backgroundColor) {
    // Tag badge: light gray background
    finalBackgroundColor = "#f5f5f5";
    finalTextColor = textColor || "#666";
    finalOpacity = 0.9;
  } else if (variant === "priceBand" && !backgroundColor) {
    // Price band badge: purple background
    finalBackgroundColor = "#764ba2";
    finalTextColor = textColor || "white";
    finalOpacity = opacity;
  } else if (variant === "custom") {
    // Custom: use provided colors
    finalBackgroundColor = backgroundColor || "#f5f5f5";
    finalTextColor = textColor || "#666";
  }

  // Convert hex to rgba if opacity is provided
  const getBackgroundColor = () => {
    if (!finalBackgroundColor) return "rgba(245, 245, 245, 0.9)";
    
    // If it's already rgba, check if we need to update opacity
    if (finalBackgroundColor.startsWith("rgba")) {
      // If opacity is explicitly set and different, update it
      if (opacity !== undefined && opacity !== 0.9) {
        const rgbaMatch = finalBackgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
          return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${finalOpacity})`;
        }
      }
      return finalBackgroundColor;
    }
    
    // If it's hex, convert to rgba with opacity
    if (finalBackgroundColor.startsWith("#")) {
      const hex = finalBackgroundColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    }
    
    return finalBackgroundColor;
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

// src/components/StarRating.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface StarRatingProps {
  /**
   * Average rating value (1-5)
   */
  avg: number | null;
  /**
   * Number of ratings
   */
  count: number | null;
  /**
   * Whether the rating is interactive (user can rate)
   */
  interactive?: boolean;
  /**
   * Initial value for interactive mode (user's current rating)
   */
  initialValue?: number | null;
  /**
   * Callback when user submits a rating
   */
  onRate?: (value: number) => void | Promise<void>;
  /**
   * Whether rating is being saved
   */
  saving?: boolean;
  /**
   * Size of stars (default: "md")
   */
  size?: "sm" | "md" | "lg";
}

/**
 * StarRating component for displaying and rating places.
 * 
 * Read-only mode: displays average rating with count
 * Interactive mode: allows users to rate (1-5 stars)
 */
export function StarRating({
  avg,
  count,
  interactive = false,
  initialValue = null,
  onRate,
  saving = false,
  size = "md",
}: StarRatingProps) {
  const { t, i18n } = useTranslation();
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(initialValue ?? null);

  // For read-only mode, use avg; for interactive, use hover or selected
  const displayValue = interactive
    ? hoverValue ?? selectedValue ?? avg
    : avg;

  // Round to nearest 0.5 for display (for half-star support later)
  const roundedValue = displayValue ? Math.round(displayValue * 2) / 2 : 0;

  const handleStarClick = async (value: number) => {
    if (!interactive || !onRate || saving) return;
    setSelectedValue(value);
    await onRate(value);
  };

  const handleStarHover = (value: number | null) => {
    if (!interactive || saving) return;
    setHoverValue(value);
  };

  const handleMouseLeave = () => {
    if (!interactive || saving) return;
    setHoverValue(null);
  };

  // Size styles
  const sizeStyles = {
    sm: { fontSize: "14px", gap: "2px" },
    md: { fontSize: "18px", gap: "4px" },
    lg: { fontSize: "24px", gap: "6px" },
  };

  const style = sizeStyles[size];

  // Get localized text for rating count
  const getRatingText = () => {
    if (count === null || count === 0) {
      // Show "Be the first!" when no ratings exist
      return t("public.beTheFirst");
    }
    const lang = i18n.language || "hu";
    if (lang === "hu") {
      return `(${count} vélemény alapján)`;
    } else if (lang === "en") {
      return `(${count} ${count === 1 ? "review" : "reviews"})`;
    } else if (lang === "de") {
      return `(${count} ${count === 1 ? "Bewertung" : "Bewertungen"})`;
    }
    return `(${count})`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: style.gap,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: interactive ? "4px" : "2px",
          cursor: interactive && !saving ? "pointer" : "default",
        }}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = roundedValue >= star;
          const isHalf = roundedValue >= star - 0.5 && roundedValue < star;
          const isHovered = hoverValue !== null && hoverValue >= star;

          return (
            <span
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              style={{
                fontSize: style.fontSize,
                color: isFilled || isHovered ? "#fbbf24" : "#d1d5db",
                cursor: interactive && !saving ? "pointer" : "default",
                transition: "all 0.2s",
                userSelect: "none",
                position: "relative",
                transform: interactive && isHovered ? "scale(1.2)" : "scale(1)",
                filter: interactive && isHovered ? "drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4))" : "none",
              }}
              title={
                interactive
                  ? `${star} ${star === 1 ? t("public.rating.starSingular") : t("public.rating.starPlural")} - ${t("public.rating.clickToRate")}`
                  : undefined
              }
            >
              {isHalf ? "☆" : "★"}
            </span>
          );
        })}
      </div>
      {(count !== null && count > 0) && (
        <span
          style={{
            fontSize: size === "sm" ? "12px" : size === "md" ? "14px" : "16px",
            color: "#6b7280",
            marginLeft: "4px",
          }}
        >
          {getRatingText()}
        </span>
      )}
      {(count === null || count === 0) && (
        <span
          style={{
            fontSize: size === "sm" ? "12px" : size === "md" ? "14px" : "16px",
            color: "#6b7280",
            marginLeft: "4px",
          }}
        >
          {getRatingText()}
        </span>
      )}
      {saving && (
        <span
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginLeft: "4px",
          }}
        >
          {t("public.saving")}
        </span>
      )}
    </div>
  );
}

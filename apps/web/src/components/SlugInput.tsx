/**
 * Custom slug input component
 * - Blocks accented characters
 * - Converts spaces to hyphens
 * - Auto-generates slug from name if empty
 */

import React, { useEffect, useState } from "react";
import type { Lang } from "../types/enums";

// Slug generation helper (matches backend logic)
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  sourceName: string; // Name field to generate slug from if value is empty
  lang: Lang;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function SlugInput({
  value,
  onChange,
  sourceName,
  lang,
  label,
  placeholder,
  required = false,
  error,
  style,
  disabled = false,
}: SlugInputProps) {
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes (e.g., when switching languages)
  useEffect(() => {
    if (!isManuallyEdited) {
      setLocalValue(value);
    }
  }, [value, isManuallyEdited]);

  // Auto-generate slug from name if empty and not manually edited
  useEffect(() => {
    if (!isManuallyEdited && !localValue && sourceName) {
      const generated = generateSlug(sourceName);
      if (generated) {
        setLocalValue(generated);
        onChange(generated);
      }
    }
  }, [sourceName, isManuallyEdited, localValue, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept space key and replace with hyphen
    if (e.key === " " || e.key === "Spacebar" || e.keyCode === 32) {
      e.preventDefault();
      e.stopPropagation();
      const input = e.currentTarget;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = localValue;
      
      // Insert hyphen at cursor position
      const newValue = currentValue.slice(0, start) + "-" + currentValue.slice(end);
      
      // Process the new value
      let processedValue = newValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-zA-Z0-9_-]/g, "") // Only allow alphanumeric, hyphens, and underscores
        .replace(/-+/g, "-") // Remove consecutive hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .toLowerCase();
      
      setLocalValue(processedValue);
      onChange(processedValue);
      setIsManuallyEdited(true);
      
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        const newCursorPos = Math.min(start + 1, processedValue.length);
        input.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Replace spaces with hyphens (this handles paste operations and other cases)
    newValue = newValue.replace(/\s+/g, "-");

    // Remove accented characters by normalizing and removing diacritics
    newValue = newValue
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Only allow alphanumeric, hyphens, and underscores
    newValue = newValue.replace(/[^a-zA-Z0-9_-]/g, "");

    // Remove consecutive hyphens
    newValue = newValue.replace(/-+/g, "-");

    // Remove leading/trailing hyphens
    newValue = newValue.replace(/^-+|-+$/g, "");

    // Convert to lowercase
    newValue = newValue.toLowerCase();

    // Only update if value actually changed (to avoid unnecessary re-renders)
    if (newValue !== localValue) {
      setLocalValue(newValue);
      onChange(newValue);
      setIsManuallyEdited(true);
    }
  };

  const handleBlur = () => {
    // Clean up the value on blur
    const cleaned = generateSlug(localValue);
    if (cleaned !== localValue) {
      setLocalValue(cleaned);
      onChange(cleaned);
    }
  };

  const hasError = !!error;

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: hasError ? "1px solid #dc3545" : "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "clamp(14px, 3.5vw, 16px)",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: disabled ? "#f3f4f6" : "white",
    ...style,
  };

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: hasError ? 600 : 500,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: hasError ? "#dc2626" : "#374151",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {label} ({lang.toUpperCase()}){required && " *"}
        </label>
      )}
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder || `slug-${lang}`}
        required={required}
        disabled={disabled}
        style={baseStyle}
      />
      {error && (
        <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
      {!error && !localValue && sourceName && (
        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
          Auto-generated from name: {generateSlug(sourceName)}
        </div>
      )}
    </div>
  );
}

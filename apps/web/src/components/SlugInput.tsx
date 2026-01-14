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

  // Auto-generate slug from name and put it in the input field
  useEffect(() => {
    if (!isManuallyEdited && sourceName) {
      const generated = generateSlug(sourceName);
      if (generated && generated !== localValue) {
        setLocalValue(generated);
        onChange(generated);
      }
    }
  }, [sourceName, isManuallyEdited, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept space key and replace with hyphen immediately
    if (e.key === " " || e.key === "Spacebar" || e.keyCode === 32) {
      e.preventDefault();
      e.stopPropagation();
      
      const input = e.currentTarget;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      // Use the actual input value, not localValue state (which might be out of sync)
      const currentValue = input.value;
      
      // Insert hyphen at cursor position
      const newValue = 
        currentValue.substring(0, start) + 
        "-" + 
        currentValue.substring(end);
      
      // Update state immediately
      setLocalValue(newValue);
      onChange(newValue);
      setIsManuallyEdited(true);
      
      // Set cursor position after the inserted hyphen
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        input.setSelectionRange(start + 1, start + 1);
      });
    }
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    // Also catch space in beforeInput event (for better browser compatibility)
    const nativeEvent = e.nativeEvent as InputEvent;
    if (nativeEvent.data === " " || nativeEvent.inputType === "insertText" && nativeEvent.data === " ") {
      e.preventDefault();
      
      const input = e.currentTarget;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value;
      
      // Insert hyphen at cursor position
      const newValue = 
        currentValue.substring(0, start) + 
        "-" + 
        currentValue.substring(end);
      
      // Update state immediately
      setLocalValue(newValue);
      onChange(newValue);
      setIsManuallyEdited(true);
      
      // Set cursor position after the inserted hyphen
      requestAnimationFrame(() => {
        input.setSelectionRange(start + 1, start + 1);
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
        onBeforeInput={handleBeforeInput}
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
    </div>
  );
}
